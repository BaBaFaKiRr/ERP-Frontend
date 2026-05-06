'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

import { erpFetch } from '@/lib/erp-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Item = { id: string; sku: string; name: string }

type Actor = {
  id: string
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  employee?: {
    employee_code?: string | null
    full_name?: string | null
  } | null
}

type MaterialIssue = {
  id: string
  item_id: string
  opening_balance: number
  new_issue_qty: number
  total_qty: number
  issued_on: string
  created_at: string
  item?: Item | null
}

type ReportMaterial = {
  id: string
  item_id: string
  closing_balance_qty: number
  wastage_qty?: number
  item?: Item | null
}

type ShiftReport = {
  id: string
  qty_produced: number
  item_produced?: Item | null
  materials?: ReportMaterial[] | null
}

type Shift = {
  id: string
  shift_date: string
  shift_type: 'day' | 'night'
  started_at: string
  ended_at?: string | null
  end_mode?: 'manual' | 'auto' | null
  target_qty: number
  produced_qty: number
  status: string
  product_item?: Item | null
  sales_order?: { id: string; order_number: string } | null
  report?: ShiftReport[] | null
}

type ReportResponse = {
  shift: Shift
  material_issues: MaterialIssue[]
  started_by: Actor | null
  ended_by: Actor | null
}

function fmtDateTime(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value))
}

function actorLabel(actor: Actor | null, fallbackAuto = false) {
  if (!actor) return fallbackAuto ? 'Auto' : '-'
  const name = [actor.employee?.employee_code, actor.employee?.full_name].filter(Boolean).join(' - ')
  const userName = [actor.first_name, actor.last_name].filter(Boolean).join(' ').trim()
  return name || userName || actor.email || '-'
}

export default function ProductionShiftReportPage() {
  const params = useParams<{ id: string; shiftId: string }>()
  const [data, setData] = useState<ReportResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await erpFetch<{ data: ReportResponse }>(
          `/api/production-lines/${params.id}/shifts/${params.shiftId}/report`,
        )
        if (mounted) setData(res.data)
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : 'Failed to load shift report')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [params.id, params.shiftId])

  const report = data?.shift.report?.[0] ?? null
  const issuesByItem = useMemo(() => {
    const map = new Map<string, MaterialIssue[]>()
    for (const row of data?.material_issues ?? []) {
      const list = map.get(row.item_id) ?? []
      list.push(row)
      map.set(row.item_id, list)
    }
    return map
  }, [data?.material_issues])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Production Line Report</h1>
        <Button asChild variant="outline">
          <Link href={`/dashboard/manufacturing/production/${params.id}`}>Back to line</Link>
        </Button>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading shift report...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {data ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Shift Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <p><span className="font-medium">Shift:</span> {data.shift.shift_date} ({data.shift.shift_type})</p>
              <p><span className="font-medium">Status:</span> {data.shift.status}</p>
              <p><span className="font-medium">Shift Started on:</span> {fmtDateTime(data.shift.started_at)}</p>
              <p><span className="font-medium">Shift Ended on:</span> {fmtDateTime(data.shift.ended_at)}</p>
              <p><span className="font-medium">Shift Started by:</span> {actorLabel(data.started_by)}</p>
              <p>
                <span className="font-medium">Shift ended by:</span>{' '}
                {data.shift.end_mode === 'auto' ? 'Auto' : actorLabel(data.ended_by, data.shift.end_mode === 'auto')}
              </p>
              <p>
                <span className="font-medium">Shift ended:</span>{' '}
                {data.shift.end_mode === 'auto' ? 'Auto terminate' : 'Manual terminate'}
              </p>
              <p>
                <span className="font-medium">Sales Order:</span>{' '}
                {data.shift.sales_order ? (
                  <Link className="text-primary hover:underline" href={`/dashboard/sales/${data.shift.sales_order.id}`}>
                    {data.shift.sales_order.order_number}
                  </Link>
                ) : '-'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Production Output</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <p>
                <span className="font-medium">Item Produced:</span>{' '}
                {report?.item_produced
                  ? `${report.item_produced.sku} - ${report.item_produced.name}`
                  : data.shift.product_item
                    ? `${data.shift.product_item.sku} - ${data.shift.product_item.name}`
                    : '-'}
              </p>
              <p><span className="font-medium">Target Qty:</span> {data.shift.target_qty}</p>
              <p><span className="font-medium">Qty Produced:</span> {report?.qty_produced ?? data.shift.produced_qty}</p>
              <p>
                <span className="font-medium">Total Raw Wastage:</span>{' '}
                {(report?.materials ?? []).reduce((sum, row) => sum + Number(row.wastage_qty ?? 0), 0)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Raw Material Issued</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {(report?.materials ?? []).length === 0 ? (
                <p className="text-muted-foreground">No material details available.</p>
              ) : (
                (report?.materials ?? []).map((row) => {
                  const issueRows = issuesByItem.get(row.item_id) ?? []
                  const openingBalance = issueRows[0]?.opening_balance ?? 0
                  const totalFromIssues = issueRows.reduce((sum, issue) => sum + Number(issue.new_issue_qty || 0), 0)
                  return (
                    <div key={row.id} className="rounded-md border p-3 space-y-2">
                      <p><span className="font-medium">Item:</span> {row.item ? `${row.item.sku} - ${row.item.name}` : row.item_id}</p>
                      <p><span className="font-medium">Opening Balance:</span> {openingBalance}</p>
                      <div>
                        <p className="font-medium">New Issue:</p>
                        {issueRows.length ? (
                          <div className="space-y-1 mt-1">
                            {issueRows.map((issue) => (
                              <p key={issue.id} className="text-muted-foreground">
                                {issue.new_issue_qty} on {fmtDateTime(issue.issued_on || issue.created_at)}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground">-</p>
                        )}
                      </div>
                      <p><span className="font-medium">Total:</span> {openingBalance + totalFromIssues}</p>
                      <p><span className="font-medium">Closing balance:</span> {row.closing_balance_qty}</p>
                      <p><span className="font-medium">Wastage:</span> {Number(row.wastage_qty ?? 0)}</p>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
