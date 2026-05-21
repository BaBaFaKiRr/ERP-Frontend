'use client'

import { useEffect, useMemo, useState } from 'react'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Users } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { cn } from '@/lib/utils'

type SalesOrderRow = {
  id: string
  order_number: string
  status: string
  order_date: string
  total_amount?: number | null
  customers?: { id?: string; name: string } | null
}

type CustomerRow = {
  id: string
  name: string
  gst_number?: string | null
  customer_type?: string | null
  created_at?: string | null
}

const statusLabel: Record<string, string> = {
  draft: 'Draft',
  pending_approval: 'Pending approval',
  approved: 'Approved',
  pending_work_order: 'Pending work order',
  work_order_open: 'Manufacturing…',
  in_progress: 'In progress',
  partially_shipped: 'Partially shipped',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
  deleted: 'Deleted',
}

const CUSTOMER_TYPE_LABEL: Record<string, string> = {
  oem: 'OEM',
  oe: 'OE',
  distributor: 'Distributor',
  export: 'Export',
  ecommerce: 'Ecommerce',
  retail: 'Retail',
}

function statusBadgeClass(status: string) {
  if (status === 'rejected') return 'bg-red-100 text-red-800'
  if (status === 'deleted') return 'bg-slate-200 text-slate-700'
  if (status === 'pending_approval') return 'bg-amber-100 text-amber-900'
  if (status === 'cancelled') return 'bg-gray-200 text-gray-700'
  return 'bg-gray-100 text-gray-800'
}

export default function SalesOverviewPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<SalesOrderRow[]>([])
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const [ordersRes, customersRes] = await Promise.all([
          erpFetch<{ data: SalesOrderRow[] }>('/api/sales-orders'),
          erpFetch<{ data: CustomerRow[] }>('/api/customers?limit=500'),
        ])
        setOrders(ordersRes.data ?? [])
        setCustomers(customersRes.data ?? [])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load sales overview')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const pendingApprovalCount = useMemo(
    () => orders.filter((o) => o.status === 'pending_approval').length,
    [orders],
  )

  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime())
        .slice(0, 5),
    [orders],
  )

  const recentCustomers = useMemo(
    () =>
      [...customers]
        .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
        .slice(0, 5),
    [customers],
  )

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Sales</h1>
          <p className="mt-2 text-gray-600">Orders, customers, and sales pipeline</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild className="gap-2">
            <Link href="/dashboard/sales/customers">
              <Users size={18} />
              Customers
            </Link>
          </Button>
          <Button asChild className="gap-2">
            <Link href="/dashboard/sales/create">
              <Plus size={18} />
              Create sales order
            </Link>
          </Button>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="border-border/70 bg-card/70 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-xl font-bold">
                  <Link href="/dashboard/sales/orders" className="hover:underline">
                    Sales Orders
                  </Link>
                </CardTitle>
                <CardDescription>Recent orders and pending approvals</CardDescription>
              </div>
              <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-sm font-semibold text-amber-700 dark:text-amber-300">
                {loading ? '—' : `${pendingApprovalCount} pending`}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href="/dashboard/sales/orders">View all orders</Link>
              </Button>
              {pendingApprovalCount > 0 ? (
                <Button asChild size="sm" variant="outline">
                  <Link href="/dashboard/sales/orders?status=pending_approval">Pending approval</Link>
                </Button>
              ) : null}
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
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
                      <TableCell colSpan={4}>No sales orders yet.</TableCell>
                    </TableRow>
                  ) : (
                    recentOrders.map((order) => (
                      <TableRow
                        key={order.id}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/40"
                        onClick={() => router.push(`/dashboard/sales/${order.id}`)}
                      >
                        <TableCell className="font-mono font-medium">{order.order_number}</TableCell>
                        <TableCell>{order.customers?.name ?? '—'}</TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-xs font-medium',
                              statusBadgeClass(order.status),
                            )}
                          >
                            {statusLabel[order.status] ?? order.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {order.total_amount != null
                            ? `₹${Number(order.total_amount).toFixed(2)}`
                            : '—'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/70 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-xl font-bold">
                  <Link href="/dashboard/sales/customers" className="hover:underline">
                    Customers
                  </Link>
                </CardTitle>
                <CardDescription>Registered customers for sales</CardDescription>
              </div>
              <span className="rounded-full bg-primary/15 px-2.5 py-1 text-sm font-semibold text-primary">
                {loading ? '—' : customers.length}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild size="sm" variant="outline" className="gap-2">
              <Link href="/dashboard/sales/customers/new">
                <Plus size={16} />
                Add customer
              </Link>
            </Button>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>GST</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={3}>Loading…</TableCell>
                    </TableRow>
                  ) : recentCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3}>No customers yet.</TableCell>
                    </TableRow>
                  ) : (
                    recentCustomers.map((customer) => (
                      <TableRow
                        key={customer.id}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/40"
                        onClick={() => router.push(`/dashboard/sales/customers/${customer.id}`)}
                      >
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>
                          {customer.customer_type
                            ? CUSTOMER_TYPE_LABEL[customer.customer_type] ?? customer.customer_type
                            : '—'}
                        </TableCell>
                        <TableCell>{customer.gst_number ?? '—'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
