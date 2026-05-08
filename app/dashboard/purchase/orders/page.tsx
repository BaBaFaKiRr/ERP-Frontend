'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Search } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'

type PurchaseOrderRow = {
  id: string
  po_number: string
  status: string
  order_date?: string | null
  expected_delivery_date?: string | null
  total_amount?: number | null
  suppliers?: { name: string } | null
  purchase_order_lines?: Array<{ id: string }> | null
}

const statusConfig = {
  draft: { color: 'bg-gray-100 text-gray-800', label: 'Draft' },
  generated: { color: 'bg-blue-100 text-blue-800', label: 'Generated' },
  goods_received: { color: 'bg-emerald-100 text-emerald-800', label: 'Goods Received' },
  closed: { color: 'bg-green-100 text-green-800', label: 'Closed' },
}

export default function PurchaseOrdersPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
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
      const res = await erpFetch<{ data: PurchaseOrderRow[] }>('/api/purchase/orders')
      setOrders(res.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load purchase orders')
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = orders.filter(
    (order) =>
      order.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.suppliers?.name ?? '').toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const totalValue = orders.reduce((sum, order) => sum + Number(order.total_amount ?? 0), 0)
  const generatedOrders = orders.filter((o) => o.status === 'generated').length
  const draftOrders = orders.filter((o) => o.status === 'draft').length

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Purchase Orders</h1>
          <p className="text-gray-600 mt-2">Manage purchase orders to suppliers</p>
        </div>
        <Link href="/dashboard/purchase/create">
          <Button className="flex items-center gap-2">
            <Plus size={18} />
            Create Purchase Order
          </Button>
        </Link>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total POs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
            <p className="text-xs text-gray-600">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Generated POs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{generatedOrders}</div>
            <p className="text-xs text-gray-600">Generated</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Draft POs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{draftOrders}</div>
            <p className="text-xs text-gray-600">Editable drafts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalValue.toLocaleString('en-IN')}</div>
            <p className="text-xs text-gray-600">Purchase value</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders</CardTitle>
          <CardDescription>Search and manage purchase orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <Input
                placeholder="Search by PO number or supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="button" variant="outline" onClick={() => void load()}>
              Refresh
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-slate-900/60">
                  <TableHead className="text-gray-700 dark:text-slate-200">PO Number</TableHead>
                  <TableHead className="text-gray-700 dark:text-slate-200">Supplier</TableHead>
                  <TableHead className="text-gray-700 dark:text-slate-200">Order Date</TableHead>
                  <TableHead className="text-gray-700 dark:text-slate-200">Expected Date</TableHead>
                  <TableHead className="text-right text-gray-700 dark:text-slate-200">Amount (INR)</TableHead>
                  <TableHead className="text-gray-700 dark:text-slate-200">Items</TableHead>
                  <TableHead className="text-gray-700 dark:text-slate-200">Status</TableHead>
                  <TableHead className="text-gray-700 dark:text-slate-200">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8}>Loading…</TableCell>
                  </TableRow>
                ) : filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8}>No purchase orders found.</TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <TableRow
                      key={order.id}
                      className="cursor-pointer text-gray-800 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800/40"
                      onClick={() =>
                        router.push(
                          order.status === 'draft'
                            ? `/dashboard/purchase/create?draftId=${order.id}`
                            : `/dashboard/purchase/orders/${order.id}`,
                        )
                      }
                    >
                      <TableCell className="font-mono font-semibold">{order.po_number}</TableCell>
                      <TableCell>{order.suppliers?.name ?? '—'}</TableCell>
                      <TableCell>
                        {order.order_date ? new Date(order.order_date).toLocaleDateString('en-GB') : '—'}
                      </TableCell>
                      <TableCell>
                        {order.expected_delivery_date
                          ? new Date(order.expected_delivery_date).toLocaleDateString('en-GB')
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {order.total_amount != null ? `₹${Number(order.total_amount).toFixed(2)}` : '—'}
                      </TableCell>
                      <TableCell>{order.purchase_order_lines?.length ?? 0}</TableCell>
                      <TableCell>
                        <span
                          className={`text-xs px-3 py-1 rounded-full ${
                            statusConfig[order.status as keyof typeof statusConfig]?.color ??
                            'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {statusConfig[order.status as keyof typeof statusConfig]?.label ??
                            order.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {order.status === 'draft' ? (
                          <Link href={`/dashboard/purchase/create?draftId=${order.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                              }}
                            >
                              Open Draft
                            </Button>
                          </Link>
                        ) : (
                          <Link href={`/dashboard/purchase/orders/${order.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                              }}
                            >
                              View
                            </Button>
                          </Link>
                        )}
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
  )
}
