import { createClient } from '@/lib/supabase/client'
import { getActiveOrganizationId } from '@/lib/organization-store'

let cachedAccessToken: string | null = null
let cachedAccessTokenExpiresAt = 0

async function getAccessToken(): Promise<string> {
  const now = Date.now()
  if (cachedAccessToken && cachedAccessTokenExpiresAt > now + 60_000) {
    return cachedAccessToken
  }

  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    cachedAccessToken = null
    cachedAccessTokenExpiresAt = 0
    throw new Error('Not authenticated')
  }

  cachedAccessToken = session.access_token
  cachedAccessTokenExpiresAt = session.expires_at
    ? session.expires_at * 1000
    : now + 3_600_000

  return session.access_token
}

export function clearCachedAccessToken() {
  cachedAccessToken = null
  cachedAccessTokenExpiresAt = 0
}

function flattenValidationErrors(value: unknown): string[] {
  if (!value || typeof value !== 'object') return []
  const obj = value as Record<string, unknown>
  const out: string[] = []

  const fieldErrors = obj.fieldErrors
  if (fieldErrors && typeof fieldErrors === 'object') {
    for (const [field, messages] of Object.entries(fieldErrors as Record<string, unknown>)) {
      if (Array.isArray(messages)) {
        for (const msg of messages) {
          if (typeof msg === 'string' && msg.trim()) out.push(`${field}: ${msg}`)
        }
      }
    }
  }

  const formErrors = obj.formErrors
  if (Array.isArray(formErrors)) {
    for (const msg of formErrors) {
      if (typeof msg === 'string' && msg.trim()) out.push(msg)
    }
  }

  return out
}

function extractErrorMessage(body: unknown): string {
  if (!body || typeof body !== 'object') return ''
  const err = body as { error?: unknown; hint?: unknown; message?: unknown }

  const parts: string[] = []
  if (typeof err.error === 'string' && err.error.trim()) parts.push(err.error)
  if (typeof err.hint === 'string' && err.hint.trim()) parts.push(err.hint)
  if (typeof err.message === 'string' && err.message.trim()) parts.push(err.message)

  if (parts.length > 0) return parts.join(' — ')

  if (typeof err.error === 'object' && err.error) {
    const flattened = flattenValidationErrors(err.error)
    if (flattened.length > 0) return flattened.join(' | ')
    try {
      return JSON.stringify(err.error)
    } catch {
      return String(err.error)
    }
  }

  return ''
}

function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_ERP_API_URL
  if (!url) {
    throw new Error(
      'NEXT_PUBLIC_ERP_API_URL is not set. Point it to your ERP-Backend (e.g. http://localhost:4000)',
    )
  }
  return url.replace(/\/$/, '')
}

type ErpFetchInit = Omit<RequestInit, 'body'> & {
  body?: BodyInit | object | null
}

export async function erpFetch<T = unknown>(
  path: string,
  init: ErpFetchInit = {},
): Promise<T> {
  const accessToken = await getAccessToken()

  const url = `${getBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData
  const normalizedBody = (
    isFormData || init.body == null || typeof init.body === 'string'
      ? init.body
      : JSON.stringify(init.body)
  ) as BodyInit | null
  const orgId = getActiveOrganizationId()
  const res = await fetch(url, {
    ...init,
    body: normalizedBody,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Bypass-Tunnel-Reminder': 'true',
      ...(orgId ? { 'X-Organization-Id': orgId } : {}),
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(init.headers ?? {}),
    },
  })

  const text = await res.text()
  let body: unknown = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = { raw: text }
  }

  if (!res.ok) {
    const msg = extractErrorMessage(body)
    throw new Error(msg || res.statusText || 'ERP API error')
  }

  return body as T
}

async function getAuthHeaders(isFormData: boolean): Promise<HeadersInit> {
  const accessToken = await getAccessToken()

  return {
    Authorization: `Bearer ${accessToken}`,
    'Bypass-Tunnel-Reminder': 'true',
    ...(getActiveOrganizationId() ? { 'X-Organization-Id': getActiveOrganizationId()! } : {}),
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
  }
}

function parseContentDispositionFilename(header: string | null): string | null {
  if (!header) return null
  const star = /filename\*=UTF-8''([^;]+)/i.exec(header)
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].trim())
    } catch {
      return star[1].trim()
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header)
  return plain?.[1]?.trim() ?? null
}

/** Authenticated fetch that returns a downloadable file (CSV export, sample, etc.). */
export async function erpFetchBlob(
  path: string,
  init: ErpFetchInit = {},
): Promise<{ blob: Blob; filename: string | null }> {
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData
  const normalizedBody = (
    isFormData || init.body == null || typeof init.body === 'string'
      ? init.body
      : JSON.stringify(init.body)
  ) as BodyInit | null
  const url = `${getBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`
  const res = await fetch(url, {
    ...init,
    body: normalizedBody,
    headers: {
      ...(await getAuthHeaders(isFormData)),
      ...(init.headers ?? {}),
    },
  })

  if (!res.ok) {
    const text = await res.text()
    let body: unknown = null
    try {
      body = text ? JSON.parse(text) : null
    } catch {
      body = { raw: text }
    }
    const msg = extractErrorMessage(body)
    throw new Error(msg || res.statusText || 'ERP API error')
  }

  const blob = await res.blob()
  const filename = parseContentDispositionFilename(res.headers.get('Content-Disposition'))
  return { blob, filename }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
