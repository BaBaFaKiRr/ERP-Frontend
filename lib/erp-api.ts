import { createClient } from '@/lib/supabase/client'

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

export async function erpFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('Not authenticated')
  }

  const url = `${getBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData
  const normalizedBody =
    isFormData || init.body == null || typeof init.body === 'string'
      ? init.body
      : JSON.stringify(init.body)
  const res = await fetch(url, {
    ...init,
    body: normalizedBody,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
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
