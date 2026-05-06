'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
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
  pending_approval: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending Approval' },
  approved: { color: 'bg-blue-100 text-blue-800', label: 'Approved' },
  completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
  cancelled: { color: 'bg-slate-200 text-slate-700', label: 'Cancelled' },
}

export default function PurchaseOrdersPage() {
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
  const approvedOrders = orders.filter((o) => o.status === 'approved').length
  const pendingOrders = orders.filter((o) => o.status === 'pending_approval').length

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
            <CardTitle className="text-sm font-medium">Approved POs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{approvedOrders}</div>
            <p className="text-xs text-gray-600">Ready for delivery</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingOrders}</div>
            <p className="text-xs text-gray-600">Awaiting approval</p>
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

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Purchase Order Process</CardTitle>
          <CardDescription>
            Material request → Create PO → Admin Approval → Send to Supplier → Receive Goods
          </CardDescription>
        </CardHeader>
      </Card>

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
                <TableRow className="bg-gray-50">
                  <TableHead>PO Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Expected Date</TableHead>
                  <TableHead className="text-right">Amount (INR)</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7}>Loading…</TableCell>
                  </TableRow>
                ) : filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>No purchase orders found.</TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-gray-50">
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
