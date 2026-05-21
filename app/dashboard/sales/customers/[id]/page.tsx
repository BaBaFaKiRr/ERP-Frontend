'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Plus } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

type Customer = {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  gst_number?: string | null
  customer_type?: string | null
  ecommerce_platform?: string | null
  contact_person?: string | null
  billing_address?: string | null
  shipping_address?: string | null
  payment_terms?: string | null
  created_at?: string | null
}

type SalesOrderRow = {
  id: string
  order_number: string
  status: string
  order_date: string
  total_amount?: number | null
  customer_id?: string
  customers?: { id?: string } | null
}

const CUSTOMER_TYPE_LABEL: Record<string, string> = {
  oem: 'OEM',
  oe: 'OE',
  distributor: 'Distributor',
  export: 'Export',
  ecommerce: 'Ecommerce',
  retail: 'Retail',
}

const ECOMMERCE_PLATFORM_LABEL: Record<string, string> = {
  amazon: 'Amazon',
  flipkart: 'Flipkart',
  direct: 'Direct',
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

function DataRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium whitespace-pre-wrap">{value?.trim() ? value : '—'}</p>
    </div>
  )
}

function statusBadgeClass(status: string) {
  if (status === 'rejected') return 'bg-red-100 text-red-800'
  if (status === 'deleted') return 'bg-slate-200 text-slate-700'
  if (status === 'pending_approval') return 'bg-amber-100 text-amber-900'
  if (status === 'cancelled') return 'bg-gray-200 text-gray-700'
  return 'bg-gray-100 text-gray-800'
}

export default function CustomerDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params.id === 'string' ? params.id : ''
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [orders, setOrders] = useState<SalesOrderRow[]>([])

  useEffect(() => {
    if (!id) return
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const [customerRes, ordersRes] = await Promise.all([
          erpFetch<{ data: Customer }>(`/api/customers/${id}`),
          erpFetch<{ data: SalesOrderRow[] }>('/api/sales-orders'),
        ])
        setCustomer(customerRes.data ?? null)
        const matched = (ordersRes.data ?? []).filter(
          (o) => o.customer_id === id || o.customers?.id === id,
        )
        setOrders(
          matched.sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime()),
        )
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load customer')
        setCustomer(null)
        setOrders([])
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  if (loading) {
    return <div className="p-8 text-muted-foreground">Loading customer…</div>
  }

  if (error || !customer) {
    return (
      <div className="p-8 space-y-4">
        <Button variant="ghost" asChild>
          <Link href="/dashboard/sales/customers">
            <ArrowLeft className="mr-2 size-4" />
            Back to customers
          </Link>
        </Button>
        <p className="text-red-600">{error ?? 'Customer not found'}</p>
      </div>
    )
  }

  const typeLabel = customer.customer_type
    ? CUSTOMER_TYPE_LABEL[customer.customer_type] ?? customer.customer_type
    : null

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/dashboard/sales/customers">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft size={16} />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{customer.name}</h1>
            <p className="text-sm text-muted-foreground">Customer details</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {typeLabel ? <Badge variant="secondary">{typeLabel}</Badge> : null}
          {customer.ecommerce_platform ? (
            <Badge variant="outline">
              {ECOMMERCE_PLATFORM_LABEL[customer.ecommerce_platform] ?? customer.ecommerce_platform}
            </Badge>
          ) : null}
          <Button asChild size="sm" className="gap-2">
            <Link href={`/dashboard/sales/create?customerId=${encodeURIComponent(customer.id)}`}>
              <Plus size={16} />
              New sales order
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contact & billing</CardTitle>
          <CardDescription>Primary contact and address information</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <DataRow label="Contact person" value={customer.contact_person} />
          <DataRow label="Phone" value={customer.phone} />
          <DataRow label="Email" value={customer.email} />
          <DataRow label="Billing address" value={customer.billing_address} />
          <DataRow label="Shipping address" value={customer.shipping_address} />
          <DataRow label="Payment terms" value={customer.payment_terms} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tax & classification</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <DataRow label="Customer type" value={typeLabel} />
          <DataRow label="GST number" value={customer.gst_number} />
          <DataRow
            label="Created"
            value={
              customer.created_at
                ? new Date(customer.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : null
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sales orders</CardTitle>
          <CardDescription>Orders linked to this customer</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      No sales orders for this customer yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow
                      key={order.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => router.push(`/dashboard/sales/${order.id}`)}
                    >
                      <TableCell className="font-mono font-medium">{order.order_number}</TableCell>
                      <TableCell>
                        {order.order_date
                          ? new Date(order.order_date).toLocaleDateString('en-GB')
                          : '—'}
                      </TableCell>
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
    </div>
  )
}
