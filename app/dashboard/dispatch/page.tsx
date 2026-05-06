'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { erpFetch } from '@/lib/erp-api'

type DispatchSalesOrder = {
  id: string
  order_number?: string | null
  status: string
  order_date?: string | null
  customers?: { name?: string | null } | null
  sales_order_lines?: Array<{ id: string; quantity?: number | null }> | null
}

const DISPATCH_ALLOWED_STATUSES = new Set([
  'approved',
  'pending_work_order',
  'work_order_open',
  'in_progress',
  'partially_shipped',
])

function statusLabel(status: string): string {
  return status
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export default function DispatchPage() {
  const [rows, setRows] = useState<DispatchSalesOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await erpFetch<{ data: DispatchSalesOrder[] }>('/api/sales-orders')
        setRows(res.data ?? [])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load dispatch orders')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const dispatchRows = useMemo(
    () => rows.filter((r) => DISPATCH_ALLOWED_STATUSES.has(String(r.status ?? ''))),
    [rows],
  )

  return (
    <div className="p-6 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Dispatch</CardTitle>
          <CardDescription>
            Sales orders ready for dispatch workflow: approved, pending_work_order, work_order_open,
            in_progress, partially_shipped.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading sales orders...</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {!loading && !error && dispatchRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sales orders in dispatch statuses.</p>
          ) : null}
          {dispatchRows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-3">SO Number</th>
                    <th className="py-2 pr-3">Customer</th>
                    <th className="py-2 pr-3">Order Date</th>
                    <th className="py-2 pr-3">Lines</th>
                    <th className="py-2 pr-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dispatchRows.map((row) => (
                    <tr key={row.id} className="border-b">
                      <td className="py-2 pr-3 font-mono">
                        <Link className="hover:underline" href={`/dashboard/sales/${row.id}`}>
                          {row.order_number ?? row.id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="py-2 pr-3">{row.customers?.name ?? '-'}</td>
                      <td className="py-2 pr-3">
                        {row.order_date ? new Date(row.order_date).toLocaleDateString('en-IN') : '-'}
                      </td>
                      <td className="py-2 pr-3">{(row.sales_order_lines ?? []).length}</td>
                      <td className="py-2 pr-3">{statusLabel(String(row.status ?? ''))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
