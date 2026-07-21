'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { EntityActivityLog } from '@/components/entity-activity-log'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

type ShiftType = 'day' | 'night'

type ItemRef = { id: string; sku?: string | null; name?: string | null } | null

type RequestLine = {
  id: string
  item_id: string
  quantity: number
  issued_qty?: number
  items?: ItemRef
}

type Request = {
  id: string
  request_number?: string | null
  production_line_id: string
  shift_date: string
  shift_type: ShiftType
  status: string
  requested_by_name?: string | null
  issued_by_name?: string | null
  denied_by_name?: string | null
  requested_at?: string
  notes?: string | null
  production_lines?: { id: string; name?: string | null } | null
  material_issue_request_lines?: RequestLine[] | null
}

type Task = {
  id: string
  item_id: string
  qty: number
  items?: ItemRef
}

type LineMaterial = {
  id: string
  item_id: string
  qty_on_hand: number
  item?: ItemRef
}

type DetailBundle = {
  request: Request
  tasks: Task[]
  line_materials: LineMaterial[]
  stock_on_hand: Record<string, number>
}

export default function MaterialIssueRequestDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id

  const [data, setData] = useState<DetailBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [issuing, setIssuing] = useState(false)
  const [storeEmployeeName, setStoreEmployeeName] = useState('')
  const [qtyToIssue, setQtyToIssue] = useState<Record<string, string>>({})
  const [meName, setMeName] = useState<string>('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await erpFetch<{ data: DetailBundle }>(`/api/material-issue-requests/${id}`)
      setData(res.data ?? null)
      const lines = res.data?.request?.material_issue_request_lines ?? []
      const init: Record<string, string> = {}
      for (const l of lines) init[l.item_id] = ''
      setQtyToIssue(init)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load request')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    void (async () => {
      try {
        const res = await erpFetch<{ user: { firstName: string | null; lastName: string | null; email: string } }>('/api/me')
        const name = `${res.user?.firstName ?? ''} ${res.user?.lastName ?? ''}`.trim() || res.user?.email || ''
        setMeName(name)
      } catch {
        setMeName('')
      }
    })()
  }, [])

  useEffect(() => {
    if (!storeEmployeeName.trim() && meName) setStoreEmployeeName(meName)
  }, [meName, storeEmployeeName])

  const request = data?.request ?? null
  const lines = request?.material_issue_request_lines ?? []
  const isPending = request?.status === 'pending'

  const rows = useMemo(() => {
    return lines.map((l) => {
      const stock = data?.stock_on_hand?.[l.item_id] ?? 0
      const toIssue = qtyToIssue[l.item_id] ?? ''
      const qtyIssued = request?.status === 'rejected' ? 0 : Number(l.issued_qty ?? 0)
      return { line: l, stock, toIssue, qtyIssued }
    })
  }, [lines, data?.stock_on_hand, qtyToIssue, request?.status])

  const issue = async () => {
    if (!request) return
    const payloadLines = rows.map((r) => ({
      item_id: r.line.item_id,
      qty_to_issue: Number(r.toIssue || 0),
      qty_requested: Number(r.line.quantity || 0),
      qty_in_stock: Number(r.stock || 0),
    }))

    for (const l of payloadLines) {
      if (!(l.qty_to_issue > 0)) {
        alert('Qty to issue is required for all rows')
        return
      }
      if (l.qty_to_issue > l.qty_in_stock) {
        alert('Qty to issue cannot exceed qty in stock')
        return
      }
      if (l.qty_to_issue > l.qty_requested) {
        alert('Qty to issue cannot exceed qty requested')
        return
      }
    }

    setIssuing(true)
    try {
      const res = await erpFetch<{ data: { stock_entry_id: string } }>(`/api/material-issue-requests/${request.id}/issue`, {
        method: 'POST',
        body: JSON.stringify({
          // Server uses logged-in user name (immutable). We keep this for backward compatibility.
          store_employee_name: storeEmployeeName.trim(),
          lines: payloadLines.map((l) => ({ item_id: l.item_id, qty_to_issue: l.qty_to_issue })),
        }),
      })
      const seId = res.data?.stock_entry_id
      if (seId) {
        router.push(`/dashboard/inventory/stock-entries/${seId}`)
      } else {
        await load()
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to issue')
    } finally {
      setIssuing(false)
    }
  }

  const deny = async () => {
    if (!request) return
    if (!confirm('Deny this request? This will not do any stock/ledger postings.')) return
    setIssuing(true)
    try {
      await erpFetch(`/api/material-issue-requests/${request.id}/deny`, { method: 'POST' })
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to deny request')
    } finally {
      setIssuing(false)
    }
  }

  if (loading && !data) {
    return <div className="p-6 md:p-8 text-sm text-muted-foreground">Loading…</div>
  }

  if (!request || error) {
    return (
      <div className="p-6 md:p-8 space-y-4">
        <Button asChild variant="ghost" className="pl-0">
          <Link href="/dashboard/inventory/material-issue-requests">
            <ArrowLeft className="size-4 mr-2" />
            Back
          </Link>
        </Button>
        <p className="text-sm text-destructive">{error ?? 'Request not found'}</p>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <Button asChild variant="ghost" className="pl-0">
        <Link href="/dashboard/inventory/material-issue-requests">
          <ArrowLeft className="size-4 mr-2" />
          Back
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{request.request_number ?? request.id.slice(0, 8) + '…'}</span>
            <Badge variant="outline">{request.status}</Badge>
          </CardTitle>
          <CardDescription>
            {request.production_lines?.name ?? 'Line'} · {request.shift_date} · {request.shift_type}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          {request.requested_by_name ? <p>Requested by: {request.requested_by_name}</p> : null}
          {request.issued_by_name ? <p>Issued by: {request.issued_by_name}</p> : null}
          {request.denied_by_name ? <p>Denied by: {request.denied_by_name}</p> : null}
          {request.notes ? <p className="text-muted-foreground">Notes: {request.notes}</p> : null}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Task details</CardTitle>
            <CardDescription>Assigned tasks for this line/day/shift</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(data.tasks ?? []).length === 0 ? (
              <p className="text-muted-foreground">No tasks found.</p>
            ) : (
              (data.tasks ?? []).map((t) => (
                <div key={t.id} className="rounded-md border px-3 py-2 flex items-center justify-between">
                  <span>
                    {t.items?.sku ?? '—'} - {t.items?.name ?? 'Item'}
                  </span>
                  <Badge variant="secondary">Qty {Number(t.qty ?? 0)}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Material at hand</CardTitle>
            <CardDescription>Current at-line balances</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(data.line_materials ?? []).length === 0 ? (
              <p className="text-muted-foreground">No material at hand.</p>
            ) : (
              (data.line_materials ?? []).map((m) => (
                <div key={m.id} className="rounded-md border px-3 py-2 flex items-center justify-between">
                  <span>
                    {m.item?.sku ?? '—'} - {m.item?.name ?? 'Item'}
                  </span>
                  <Badge variant="outline">Qty {Number(m.qty_on_hand ?? 0)}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Issue material</CardTitle>
          <CardDescription>
            {isPending ? 'Fill all rows, then issue.' : 'Issued/approved quantities for this request.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isPending ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-sm font-medium mb-1">Store employee name</p>
                <Input value={storeEmployeeName} readOnly />
              </div>
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">Item</th>
                  <th className="py-2 pr-3">Qty requested</th>
                  {isPending ? (
                    <>
                      <th className="py-2 pr-3">Qty in stock</th>
                      <th className="py-2 pr-3">Qty to issue</th>
                    </>
                  ) : (
                    <th className="py-2 pr-3">Qty issued</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.line.item_id} className="border-b">
                    <td className="py-2 pr-3">
                      {r.line.items?.sku ?? '—'} - {r.line.items?.name ?? 'Item'}
                    </td>
                    <td className="py-2 pr-3">{Number(r.line.quantity ?? 0)}</td>
                    {isPending ? (
                      <>
                        <td className="py-2 pr-3">{Number(r.stock ?? 0)}</td>
                        <td className="py-2 pr-3">
                          <Input
                            type="number"
                            min="0"
                            value={r.toIssue}
                            onChange={(e) => setQtyToIssue((prev) => ({ ...prev, [r.line.item_id]: e.target.value }))}
                          />
                        </td>
                      </>
                    ) : (
                      <td className="py-2 pr-3">{Number(r.qtyIssued ?? 0)}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {isPending ? (
            <div className="flex justify-end">
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => void deny()} disabled={issuing}>
                  Deny
                </Button>
                <Button onClick={() => void issue()} disabled={issuing}>
                  {issuing ? 'Issuing…' : 'Issue'}
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <EntityActivityLog entityType="material_issue_request" entityId={data?.request?.id} />
    </div>
  )
}

