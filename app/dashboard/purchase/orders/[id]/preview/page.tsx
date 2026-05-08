'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function PurchaseOrderPreviewPage() {
  const params = useParams<{ id: string }>()
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const supabase = createClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session?.access_token) throw new Error('Not authenticated')
        const baseUrl = process.env.NEXT_PUBLIC_ERP_API_URL?.replace(/\/$/, '')
        if (!baseUrl) throw new Error('NEXT_PUBLIC_ERP_API_URL is not set')

        const response = await fetch(`${baseUrl}/api/purchase/orders/${params.id}/pdf`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (!response.ok) {
          const text = await response.text()
          throw new Error(text || 'Failed to generate purchase order PDF')
        }
        const blob = await response.blob()
        const objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load purchase order preview')
      }
    })()

    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  if (error) return <div className="p-6 text-sm text-red-600">{error}</div>
  if (!url) return <div className="p-6 text-sm text-muted-foreground">Generating purchase order preview...</div>

  return (
    <div className="h-screen w-full bg-muted/20">
      <iframe title="Purchase Order Preview" src={url} className="h-full w-full border-0" />
    </div>
  )
}
