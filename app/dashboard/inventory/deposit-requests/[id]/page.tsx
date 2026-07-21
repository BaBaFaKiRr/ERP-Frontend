'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { EntityActivityLog } from '@/components/entity-activity-log'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type RequestLine = {
  id: string
  item_id: string
  quantity: number
  approved_qty?: number
  source_bucket?: 'normal' | 'wastage'
  items?: { id: string; sku?: string | null; name?: string | null } | null
}
type Request = {
  id: string
  request_number?: string | null
  status: string
  notes?: string | null
  requested_by_name?: string | null
  approved_by_name?: string | null
  rejected_by_name?: string | null
  production_lines?: { id: string; name?: string | null } | null
  material_deposit_request_lines?: RequestLine[] | null
}
type DetailBundle = {
  request: Request
  line_materials: Array<{
    id: string
    item_id: string
    qty_on_hand: number
    bucket?: 'normal' | 'wastage'
    item?: { sku?: string | null; name?: string | null } | null
  }>
  stock_on_hand: Record<string, number>
}

export default function DepositRequestDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<DetailBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await erpFetch<{ data: DetailBundle }>(`/api/material-deposit-requests/${params.id}`)
      setData(res.data ?? null)
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    void load()
  }, [load])

  const request = data?.request ?? null
  const isPending = request?.status === 'pending'
  const isApproved = request?.status === 'approved'
  const isRejected = request?.status === 'rejected'
  const rows = useMemo(() => request?.material_deposit_request_lines ?? [], [request])

  const approve = async () => {
    if (!request) return
    setActing(true)
    try {
      const res = await erpFetch<{ data: { stock_entry_id: string } }>(`/api/material-deposit-requests/${request.id}/approve`, { method: 'POST' })
      const seId = res.data?.stock_entry_id
      if (seId) router.push(`/dashboard/inventory/stock-entries/${seId}`)
      else await load()
    } finally {
      setActing(false)
    }
  }
  const reject = async () => {
    if (!request) return
    setActing(true)
    try {
      await erpFetch(`/api/material-deposit-requests/${request.id}/reject`, { method: 'POST' })
      await load()
    } finally {
      setActing(false)
    }
  }

  if (loading && !data) return <div className="p-6 md:p-8 text-sm text-muted-foreground">Loading...</div>
  if (!request) return <div className="p-6 md:p-8 text-sm text-destructive">Request not found</div>

  return (
    <div className="p-6 md:p-8 space-y-6">
      <Button asChild variant="ghost" className="pl-0">
        <Link href="/dashboard/inventory/deposit-requests"><ArrowLeft className="size-4 mr-2" />Back</Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="font-mono">{request.request_number ?? request.id.slice(0, 8)}</span>
            <Badge variant="outline">{request.status.toUpperCase()}</Badge>
          </CardTitle>
          <CardDescription>{request.production_lines?.name ?? 'Line'}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          {request.requested_by_name ? <p>Requested by: {request.requested_by_name}</p> : null}
          {request.approved_by_name ? <p>Approved by: {request.approved_by_name}</p> : null}
          {request.rejected_by_name ? <p>Rejected by: {request.rejected_by_name}</p> : null}
          {request.notes ? <p className="text-muted-foreground">Notes: {request.notes}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Deposit items</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-3">Item</th>
                {isPending ? <th className="py-2 pr-3">Qty to Deposit</th> : null}
                {isPending ? <th className="py-2 pr-3">Qty at Line</th> : null}
                {isApproved ? <th className="py-2 pr-3">Qty Deposited</th> : null}
                {isRejected ? <th className="py-2 pr-3">Qty Proposed</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="py-2 pr-3">{r.items?.sku ?? '—'}{r.source_bucket === 'wastage' ? ' Wastage' : ''} - {r.items?.name ?? 'Item'}</td>
                  {isPending ? <td className="py-2 pr-3">{Number(r.quantity ?? 0)}</td> : null}
                  {isPending ? (
                    <td className="py-2 pr-3">
                      {Number((data?.line_materials ?? []).find((x) => x.item_id === r.item_id && (x.bucket ?? 'normal') === (r.source_bucket ?? 'normal'))?.qty_on_hand ?? 0)}
                    </td>
                  ) : null}
                  {isApproved ? <td className="py-2 pr-3">{Number(r.approved_qty ?? 0)}</td> : null}
                  {isRejected ? <td className="py-2 pr-3">{Number(r.quantity ?? 0)}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {isPending ? (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => void reject()} disabled={acting}>Reject</Button>
          <Button onClick={() => void approve()} disabled={acting}>{acting ? 'Processing…' : 'Approve'}</Button>
        </div>
      ) : null}

      <EntityActivityLog entityType="material_deposit_request" entityId={data?.request?.id} />
    </div>
  )
}

