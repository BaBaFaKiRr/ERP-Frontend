'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { erpFetch } from '@/lib/erp-api'

type Req = {
  id: string
  request_number?: string | null
  shift_date: string
  shift_type: 'day' | 'night'
  status: string
  requested_by_name?: string | null
  issued_by_name?: string | null
  denied_by_name?: string | null
  requested_at?: string
  production_lines?: { id: string; name?: string | null } | null
  material_issue_request_lines?: Array<{ id: string; quantity: number; items?: { sku?: string | null; name?: string | null } | null }>
}

export default function MaterialIssueRequestsPage() {
  const router = useRouter()
  const [rows, setRows] = useState<Req[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const res = await erpFetch<{ data: Req[] }>('/api/material-issue-requests')
        setRows(res.data ?? [])
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const sortedRows = useMemo(() => {
    const rank = (s: string) => {
      if (s === 'pending') return 0
      if (s === 'issued' || s === 'approved') return 1
      if (s === 'rejected' || s === 'denied') return 2
      return 3
    }
    return rows
      .map((r, idx) => ({ r, idx }))
      .sort((a, b) => {
        const ra = rank(a.r.status)
        const rb = rank(b.r.status)
        if (ra !== rb) return ra - rb
        return a.idx - b.idx
      })
      .map((x) => x.r)
  }, [rows])

  const statusChip = (status: string) => {
    if (status === 'pending') {
      return <span className="rounded-md border border-yellow-300 bg-yellow-100 px-3 py-1 text-sm font-semibold text-yellow-900">PENDING</span>
    }
    if (status === 'issued' || status === 'approved') {
      return <span className="rounded-md border border-green-300 bg-green-100 px-3 py-1 text-sm font-semibold text-green-900">APPROVED</span>
    }
    if (status === 'rejected' || status === 'denied') {
      return <span className="rounded-md border border-red-300 bg-red-100 px-3 py-1 text-sm font-semibold text-red-900">REJECTED</span>
    }
    return <span className="rounded-md border px-3 py-1 text-sm font-semibold">{status.toUpperCase()}</span>
  }

  return (
    <div className="p-6 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Material Issue Requests</CardTitle>
          <CardDescription>Review requests raised from start shift page.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No requests yet.</p>
          ) : (
            <div className="space-y-3">
              {sortedRows.map((r) => (
                <div
                  key={r.id}
                  className="rounded-md border p-3 cursor-pointer hover:bg-muted/40"
                  onClick={() => router.push(`/dashboard/inventory/material-issue-requests/${r.id}`)}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">
                      {r.request_number ? (
                        <span className="font-mono">{r.request_number}</span>
                      ) : (
                        <span className="font-mono">{r.id.slice(0, 8)}…</span>
                      )}{' '}
                      · {r.production_lines?.name ?? 'Line'} · {r.shift_date} · {r.shift_type}
                    </p>
                    {statusChip(r.status)}
                  </div>
                  {r.requested_by_name ? (
                    <p className="mt-1 text-xs text-muted-foreground">Requested by: {r.requested_by_name}</p>
                  ) : null}
                  {r.issued_by_name ? (
                    <p className="mt-1 text-xs text-muted-foreground">Issued by: {r.issued_by_name}</p>
                  ) : null}
                  {r.denied_by_name ? (
                    <p className="mt-1 text-xs text-muted-foreground">Denied by: {r.denied_by_name}</p>
                  ) : null}
                  <ul className="mt-2 text-sm space-y-1">
                    {(r.material_issue_request_lines ?? []).map((l) => (
                      <li key={l.id}>
                        {(l.items?.sku ?? '—')} - {(l.items?.name ?? 'Item')} · Qty {l.quantity}
                      </li>
                    ))}
                  </ul>
                  {r.status === 'pending' ? (
                    <div className="mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/dashboard/inventory/material-issue-requests/${r.id}`)
                        }}
                      >
                        Action
                      </Button>
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
