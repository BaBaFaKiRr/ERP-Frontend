'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { erpFetch } from '@/lib/erp-api'

type Req = {
  id: string
  request_number?: string | null
  status: string
  requested_by_name?: string | null
  approved_by_name?: string | null
  rejected_by_name?: string | null
  production_lines?: { id: string; name?: string | null } | null
  material_deposit_request_lines?: Array<{
    id: string
    quantity: number
    approved_qty?: number
    source_bucket?: 'normal' | 'wastage'
    items?: { sku?: string | null; name?: string | null } | null
  }>
}

export default function DepositRequestsPage() {
  const router = useRouter()
  const [rows, setRows] = useState<Req[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const res = await erpFetch<{ data: Req[] }>('/api/material-deposit-requests')
        setRows(res.data ?? [])
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const sortedRows = useMemo(() => {
    const rank = (s: string) => (s === 'pending' ? 0 : s === 'approved' ? 1 : s === 'rejected' ? 2 : 3)
    return [...rows].sort((a, b) => rank(a.status) - rank(b.status))
  }, [rows])

  const chip = (s: string) =>
    s === 'pending' ? (
      <span className="rounded-md border border-yellow-300 bg-yellow-100 px-3 py-1 text-sm font-semibold text-yellow-900">PENDING</span>
    ) : s === 'approved' ? (
      <span className="rounded-md border border-green-300 bg-green-100 px-3 py-1 text-sm font-semibold text-green-900">APPROVED</span>
    ) : (
      <span className="rounded-md border border-red-300 bg-red-100 px-3 py-1 text-sm font-semibold text-red-900">REJECTED</span>
    )

  return (
    <div className="p-6 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Deposit Requests</CardTitle>
          <CardDescription>Review and approve/reject deposit requests from production lines.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : sortedRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No requests yet.</p>
          ) : (
            <div className="space-y-3">
              {sortedRows.map((r) => (
                <div key={r.id} className="rounded-md border p-3 cursor-pointer hover:bg-muted/40" onClick={() => router.push(`/dashboard/inventory/deposit-requests/${r.id}`)}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">
                      <span className="font-mono">{r.request_number ?? `${r.id.slice(0, 8)}…`}</span> · {r.production_lines?.name ?? 'Line'}
                    </p>
                    {chip(r.status)}
                  </div>
                  {r.requested_by_name ? <p className="mt-1 text-xs text-muted-foreground">Requested by: {r.requested_by_name}</p> : null}
                  {r.approved_by_name ? <p className="mt-1 text-xs text-muted-foreground">Approved by: {r.approved_by_name}</p> : null}
                  {r.rejected_by_name ? <p className="mt-1 text-xs text-muted-foreground">Rejected by: {r.rejected_by_name}</p> : null}
                  <ul className="mt-2 text-sm space-y-1">
                    {(r.material_deposit_request_lines ?? []).map((l) => (
                      <li key={l.id}>{l.items?.sku ?? '—'}{l.source_bucket === 'wastage' ? ' Wastage' : ''} - {l.items?.name ?? 'Item'} · Qty {l.quantity}</li>
                    ))}
                  </ul>
                  {r.status === 'pending' ? (
                    <div className="mt-2">
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/inventory/deposit-requests/${r.id}`) }}>Action</Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

