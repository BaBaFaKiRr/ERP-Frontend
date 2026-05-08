'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowRight } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'

type InventoryBalanceRow = {
  item_id: string
  qty_on_hand: number | null
  items: {
    sku: string
    name: string
    reorder_level: number | null
  } | null
}

type PurchaseOrderRow = {
  id: string
  po_number: string
  status: string
  total_amount?: number | null
  order_date?: string | null
  suppliers?: { name?: string | null } | null
}

export default function PurchaseOverviewPage() {
  const [balances, setBalances] = useState<InventoryBalanceRow[]>([])
  const [orders, setOrders] = useState<PurchaseOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void load()
  }, [])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [balancesRes, ordersRes] = await Promise.all([
        erpFetch<{ data: InventoryBalanceRow[] }>('/api/inventory/balances'),
        erpFetch<{ data: PurchaseOrderRow[] }>('/api/purchase/orders'),
      ])
      setBalances(balancesRes.data ?? [])
      setOrders(ordersRes.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load purchase overview')
    } finally {
      setLoading(false)
    }
  }

  const stockAlerts = useMemo(
    () =>
      balances
        .filter((row) => {
          if (!row.items) return false
          const minQty = Number(row.items.reorder_level ?? 0)
          const stockQty = Number(row.qty_on_hand ?? 0)
          return minQty > 0 && stockQty < minQty
        })
        .sort(
          (a, b) =>
            Number(b.items?.reorder_level ?? 0) -
            Number(b.qty_on_hand ?? 0) -
            (Number(a.items?.reorder_level ?? 0) - Number(a.qty_on_hand ?? 0)),
        ),
    [balances],
  )

  const recentOrders = useMemo(() => orders.slice(0, 5), [orders])

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Purchase</h1>
          <p className="text-gray-600 mt-2">Overview and quick access to purchase operations</p>
        </div>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Purchase Overview</CardTitle>
          <CardDescription>Monitor stock alerts and latest purchase orders</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            This page now surfaces low-stock alerts and recent purchase order activity.
          </p>
        </CardContent>
      </Card>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Stock Alerts</CardTitle>
            <CardDescription>Items below reorder warning</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead className="text-right">Qty in Stock</TableHead>
                    <TableHead className="text-right">Min Qty</TableHead>
                    <TableHead className="text-right">Qty to Order</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6}>Loading…</TableCell>
                    </TableRow>
                  ) : stockAlerts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6}>No stock alerts right now.</TableCell>
                    </TableRow>
                  ) : (
                    stockAlerts.map((row) => {
                      const stockQty = Number(row.qty_on_hand ?? 0)
                      const minQty = Number(row.items?.reorder_level ?? 0)
                      const qtyToOrder = Math.max(minQty - stockQty, 0)

                      return (
                        <TableRow key={row.item_id}>
                          <TableCell className="font-mono">{row.items?.sku ?? '—'}</TableCell>
                          <TableCell>{row.items?.name ?? '—'}</TableCell>
                          <TableCell className="text-right">{stockQty}</TableCell>
                          <TableCell className="text-right">{minQty}</TableCell>
                          <TableCell className="text-right font-semibold text-amber-600">
                            {qtyToOrder}
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/dashboard/purchase/create?itemId=${row.item_id}&qty=${qtyToOrder}`}>
                              <Button size="sm" variant="outline">Create PO</Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Purchase Orders</CardTitle>
            <CardDescription>Latest purchase order records</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4}>Loading…</TableCell>
                    </TableRow>
                  ) : recentOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4}>No purchase orders yet.</TableCell>
                    </TableRow>
                  ) : (
                    recentOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono">{order.po_number}</TableCell>
                        <TableCell>{order.suppliers?.name ?? '—'}</TableCell>
                        <TableCell className="capitalize">{order.status.replace(/_/g, ' ')}</TableCell>
                        <TableCell className="text-right">
                          {order.total_amount != null ? `₹${Number(order.total_amount).toFixed(2)}` : '—'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Link href="/dashboard/purchase/orders">
              <Button className="flex items-center gap-2">
                <span>Open Purchase Orders</span>
                <ArrowRight size={16} />
              </Button>
            </Link>
            <Button type="button" variant="outline" onClick={() => void load()}>
              Refresh Widgets
            </Button>
          </div>
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Purchase Orders continues to use the existing PO management screen.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
