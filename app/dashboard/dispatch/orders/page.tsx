'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { erpFetch } from '@/lib/erp-api'

type DispatchOrder = {
  id: string
  do_number?: string | null
  sales_order_id: string
  sales_order_number?: string | null
  customer_name?: string | null
  status: string
  created_at: string
  dispatch_order_lines?: Array<{ id: string }>
  sales_orders?: { id?: string; order_number?: string | null } | null
}

function statusLabel(status: string): string {
  if (status === 'rejected_by_admin') return 'Rejected by Admin'
  if (status === 'waiting_to_dispatch') return 'Waiting To Dispatch'
  if (status === 'sent') return 'Sent'
  return status
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function dispatchOrderMatchesSearch(row: DispatchOrder, q: string): boolean {
  const s = q.trim().toLowerCase()
  if (!s) return true
  const doNumber = (row.do_number ?? '').toLowerCase()
  const soNumber = (row.sales_order_number ?? row.sales_orders?.order_number ?? '').toLowerCase()
  const customer = (row.customer_name ?? '').toLowerCase()
  return doNumber.includes(s) || soNumber.includes(s) || customer.includes(s)
}

export default function DispatchOrdersPage() {
  const router = useRouter()
  const [rows, setRows] = useState<DispatchOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await erpFetch<{ data: DispatchOrder[] }>('/api/dispatch/orders')
        setRows(res.data ?? [])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load dispatch orders')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const displayed = useMemo(
    () => rows.filter((row) => dispatchOrderMatchesSearch(row, searchTerm)),
    [rows, searchTerm],
  )

  return (
    <div className="p-6 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Dispatch orders</CardTitle>
          <CardDescription>
            All generated dispatch orders and their current status.
            {!loading && (
              <span className="block text-xs text-muted-foreground mt-1">
                Showing {displayed.length} of {rows.length} orders
                {searchTerm.trim() ? ` · matching “${searchTerm.trim()}”` : ''}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <Input
              placeholder="Search by customer name, sales order number, or dispatch order number…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {loading ? <p className="text-sm text-muted-foreground">Loading dispatch orders...</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {!loading && !error && rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No dispatch orders found.</p>
          ) : null}
          {!loading && !error && rows.length > 0 && displayed.length === 0 ? (
            <p className="text-sm text-muted-foreground">No dispatch orders match your search.</p>
          ) : null}
          {displayed.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-3">Dispatch Order</th>
                    <th className="py-2 pr-3">Sales Order</th>
                    <th className="py-2 pr-3">Customer</th>
                    <th className="py-2 pr-3">Created On</th>
                    <th className="py-2 pr-3">Lines</th>
                    <th className="py-2 pr-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((row) => {
                    const salesOrderNumber =
                      row.sales_order_number ?? row.sales_orders?.order_number ?? '—'
                    return (
                      <tr
                        key={row.id}
                        className="border-b cursor-pointer hover:bg-muted/40"
                        onClick={() => router.push(`/dashboard/finance/invoice-requests/${row.id}`)}
                      >
                        <td className="py-2 pr-3 font-mono">
                          <Link
                            className="hover:underline"
                            href={`/dashboard/finance/invoice-requests/${row.id}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {row.do_number ?? '—'}
                          </Link>
                        </td>
                        <td className="py-2 pr-3">
                          <Link
                            className="hover:underline"
                            href={`/dashboard/sales/${row.sales_order_id}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {salesOrderNumber}
                          </Link>
                        </td>
                        <td className="py-2 pr-3">{row.customer_name ?? '-'}</td>
                        <td className="py-2 pr-3">{new Date(row.created_at).toLocaleString('en-IN')}</td>
                        <td className="py-2 pr-3">{(row.dispatch_order_lines ?? []).length}</td>
                        <td className="py-2 pr-3">
                          <span
                            className={
                              row.status === 'rejected_by_admin'
                                ? 'text-red-600 text-xl font-semibold'
                                : ''
                            }
                          >
                            {statusLabel(String(row.status ?? ''))}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
