import { createClient } from '@/lib/supabase/client'

function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_ERP_API_URL
  if (!url) {
    throw new Error(
      'NEXT_PUBLIC_ERP_API_URL is not set. Point it to your ERP-Backend (e.g. http://localhost:4000)',
    )
  }
  return url.replace(/\/$/, '')
}

/**
 * Downloads PI as PDF from ERP-Backend (Puppeteer + inline HTML). Matches preview without client-side canvas/CSS limits.
 */
export async function downloadProformaPdf(params: {
  orderId: string
  fileName: string
  documentDate: Date
  validUntil: Date
}): Promise<void> {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('Not authenticated')
  }

  const qs = new URLSearchParams({
    documentDate: params.documentDate.toISOString(),
    validUntil: params.validUntil.toISOString(),
  })
  const url = `${getBaseUrl()}/api/sales-orders/${encodeURIComponent(params.orderId)}/proforma-pdf?${qs.toString()}`

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  })

  if (!res.ok) {
    let msg = res.statusText
    try {
      const j = (await res.json()) as { error?: string; details?: string }
      msg = [j.error, j.details].filter(Boolean).join(' — ') || msg
    } catch {
      const t = await res.text()
      if (t) msg = t.slice(0, 200)
    }
    throw new Error(msg)
  }

  const blob = await res.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = params.fileName
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(a.href)
}
