'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { erpFetch } from '@/lib/erp-api'
import { Button } from '@/components/ui/button'

/** Old URL: forwards to `/generate/[salesOrderId]?line=…`. */
export default function GenerateWorkOrderFromLineRedirectPage() {
  const params = useParams()
  const router = useRouter()
  const salesOrderLineId = typeof params.salesOrderLineId === 'string' ? params.salesOrderLineId : ''
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!salesOrderLineId) return
    void (async () => {
      try {
        const res = await erpFetch<{
          data: { sales_order_line: { sales_orders?: { id: string } | null } }
        }>(`/api/work-orders/from-sales-order-line/${salesOrderLineId}/preview`)
        const soId = res.data?.sales_order_line?.sales_orders?.id
        if (soId) {
          router.replace(
            `/dashboard/manufacturing/work-orders/generate/${soId}?line=${salesOrderLineId}`,
          )
          return
        }
        setErr('Could not resolve sales order for this line.')
      } catch {
        setErr('Failed to load line preview.')
      }
    })()
  }, [salesOrderLineId, router])

  if (err) {
    return (
      <div className="p-8 space-y-4">
        <p className="text-sm text-red-600">{err}</p>
        <Button variant="outline" asChild>
          <Link href="/dashboard/sales">Back to sales</Link>
        </Button>
      </div>
    )
  }

  return <div className="p-8 text-muted-foreground">Opening create work order…</div>
}
