import { createClient } from '@/lib/supabase/client'

export function getErpApiBaseUrl(): string {
  if (typeof window !== 'undefined') return '/erp-api'
  const baseUrl = process.env.NEXT_PUBLIC_ERP_API_URL?.replace(/\/$/, '')
  if (!baseUrl) throw new Error('NEXT_PUBLIC_ERP_API_URL is not set')
  return baseUrl
}

function getApiBaseUrl(): string {
  return getErpApiBaseUrl()
}

async function getAccessToken(): Promise<string> {
  const supabase = createClient()
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) throw new Error('Not authenticated')
  return token
}

export async function fetchPdfBlob(apiPath: string): Promise<Blob> {
  const token = await getAccessToken()
  const res = await fetch(`${getApiBaseUrl()}${apiPath}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    let message = 'Failed to fetch PDF'
    try {
      const body = (await res.json()) as { error?: string; details?: string }
      message = body.details?.trim() || body.error?.trim() || message
    } catch {
      // Response was not JSON (e.g. HTML error page).
    }
    throw new Error(message)
  }
  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('application/pdf')) {
    throw new Error(`Expected application/pdf but received ${contentType || 'unknown content type'}`)
  }
  return res.blob()
}
