'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'

type DispatchLine = {
  sales_order_line_id: string
  item_id: string
  item_sku?: string | null
  item_name?: string | null
  qty_ordered: number
  qty_shipped: number
  qty_remaining: number
  qty_in_stock: number
  unit_price: number
}

type DispatchSalesOrderDetail = {
  sales_order: {
    id: string
    order_number?: string | null
    status: string
    order_date?: string | null
    notes?: string | null
    customer?: { id?: string | null; name?: string | null } | null
  }
  lines: DispatchLine[]
}

type DraftRow = DispatchLine & {
  picked: boolean
  qty_to_dispatch: string
  unit_price_edit: string
}

function statusLabel(status: string): string {
  return status
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export default function DispatchSalesOrderPage() {
  const params = useParams<{ salesOrderId: string }>()
  const router = useRouter()
  const [detail, setDetail] = useState<DispatchSalesOrderDetail | null>(null)
  const [rows, setRows] = useState<DraftRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await erpFetch<{ data: DispatchSalesOrderDetail }>(`/api/dispatch/sales-orders/${params.salesOrderId}`)
        setDetail(res.data)
        setRows(
          (res.data?.lines ?? []).map((l) => ({
            ...l,
            picked: false,
            qty_to_dispatch: '',
            unit_price_edit: String(Number(l.unit_price ?? 0)),
          })),
        )
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load sales order')
      } finally {
        setLoading(false)
      }
    })()
  }, [params.salesOrderId])

  const selectedRows = useMemo(
    () => rows.filter((r) => r.picked && Number(r.qty_to_dispatch || 0) > 0),
    [rows],
  )

  const updateRow = (idx: number, patch: Partial<DraftRow>) =>
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))

  const generateDispatchOrder = async () => {
    if (selectedRows.length === 0) return
    for (const row of rows) {
      if (!row.picked) continue
      const qty = Number(row.qty_to_dispatch || 0)
      if (!(qty > 0)) {
        alert(`Qty to Dispatch must be greater than 0 for ${row.item_sku ?? row.item_id}`)
        return
      }
      if (qty > row.qty_remaining + 0.0005) {
        alert(`Qty to Dispatch exceeds remaining qty for ${row.item_sku ?? row.item_id}`)
        return
      }
      if (qty > row.qty_in_stock + 0.0005) {
        alert(`Qty to Dispatch exceeds stock qty for ${row.item_sku ?? row.item_id}`)
        return
      }
    }
    if (!confirm('Generate dispatch order for selected items?')) return
    setSubmitting(true)
    try {
      const payload = {
        sales_order_id: detail?.sales_order.id,
        lines: rows
          .filter((r) => r.picked)
          .map((r) => ({
            item_id: r.item_id,
            qty_to_dispatch: Number(r.qty_to_dispatch || 0),
            unit_price: Number(r.unit_price_edit || 0),
          })),
      }
      await erpFetch('/api/dispatch/orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      router.push('/dashboard/dispatch/orders')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to generate dispatch order')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <Button asChild variant="ghost" className="pl-0">
        <Link href="/dashboard/dispatch/sales-orders">
          <ArrowLeft className="size-4 mr-2" /> Back to Sales Orders
        </Link>
      </Button>

      {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {detail ? (
        <Card>
          <CardHeader>
            <CardTitle>Dispatch Sales Order</CardTitle>
            <CardDescription>
              {detail.sales_order.order_number ?? detail.sales_order.id} · {detail.sales_order.customer?.name ?? '-'} ·{' '}
              {statusLabel(detail.sales_order.status)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <p><span className="font-medium">Order Number:</span> {detail.sales_order.order_number ?? '-'}</p>
              <p><span className="font-medium">Customer:</span> {detail.sales_order.customer?.name ?? '-'}</p>
              <p><span className="font-medium">Order Date:</span> {detail.sales_order.order_date ? new Date(detail.sales_order.order_date).toLocaleDateString('en-IN') : '-'}</p>
            </div>

            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Sales order items</h3>
              <Button onClick={() => void generateDispatchOrder()} disabled={submitting || selectedRows.length === 0}>
                {submitting ? 'Generating...' : 'Generate Dispatch Order'}
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-3">Pick</th>
                    <th className="py-2 pr-3">Item</th>
                    <th className="py-2 pr-3">Qty Ordered</th>
                    <th className="py-2 pr-3">Qty Shipped</th>
                    <th className="py-2 pr-3">Qty in Stock</th>
                    <th className="py-2 pr-3">Qty to Dispatch</th>
                    <th className="py-2 pr-3">Unit Price</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={row.sales_order_line_id} className="border-b">
                      <td className="py-2 pr-3">
                        <Checkbox checked={row.picked} onCheckedChange={(v) => updateRow(idx, { picked: Boolean(v) })} />
                      </td>
                      <td className="py-2 pr-3">{row.item_sku ?? '—'} - {row.item_name ?? 'Item'}</td>
                      <td className="py-2 pr-3">{Number(row.qty_ordered ?? 0)}</td>
                      <td className="py-2 pr-3">{Number(row.qty_shipped ?? 0)}</td>
                      <td className="py-2 pr-3">{Number(row.qty_in_stock ?? 0)}</td>
                      <td className="py-2 pr-3">
                        <Input
                          type="number"
                          min="0"
                          disabled={!row.picked}
                          value={row.qty_to_dispatch}
                          onChange={(e) => updateRow(idx, { qty_to_dispatch: e.target.value })}
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <Input
                          type="number"
                          min="0"
                          disabled={!row.picked}
                          value={row.unit_price_edit}
                          onChange={(e) => updateRow(idx, { unit_price_edit: e.target.value })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
