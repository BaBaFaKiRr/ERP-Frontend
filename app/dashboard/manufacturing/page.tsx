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
import { Search } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'

type SalesOrderRow = {
  id: string
  order_number: string
  status: string
  order_date: string
  delivery_date?: string | null
  customers?: { id?: string; name: string } | null
}

const closedStatuses = new Set(['completed', 'cancelled', 'rejected', 'deleted'])

const statusLabel: Record<string, string> = {
  draft: 'Draft',
  pending_approval: 'Pending approval',
  approved: 'Approved',
  pending_work_order: 'Pending work order',
  work_order_open: 'Manufacturing...',
  in_progress: 'In progress',
  partially_shipped: 'Partially shipped',
}

export default function ManufacturingPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [openSalesOrders, setOpenSalesOrders] = useState<SalesOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void load()
  }, [])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const salesRes = await erpFetch<{ data: SalesOrderRow[] }>('/api/sales-orders')
      const open = (salesRes.data ?? []).filter((so) => !closedStatuses.has(so.status))
      setOpenSalesOrders(open)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  const filteredOpenSalesOrders = openSalesOrders.filter(
    (o) =>
      o.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.customers?.name ?? '').toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="p-6 md:p-8">
      {error && (
        <p className="text-sm text-red-600 mb-4">
          {error}. Set NEXT_PUBLIC_ERP_API_URL and run ERP-Backend.
        </p>
      )}

      <Card className="border-border/70 bg-card/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Sales Orders</CardTitle>
          <CardDescription>
            All open sales orders for manufacturing tracking. Generate WO using API:
            <code className="ml-1 text-xs">POST /api/work-orders/from-sales-order/:salesOrderId</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex gap-4">
            <div className="flex-1 relative">
              <Search className="text-app-text-muted absolute top-3 left-3" size={18} />
              <Input
                placeholder="Search WO or SO…"
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
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Sales order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3}>Loading…</TableCell>
                  </TableRow>
                ) : filteredOpenSalesOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3}>No open sales orders.</TableCell>
                  </TableRow>
                ) : (
                  filteredOpenSalesOrders.map((so) => (
                    <TableRow
                      key={so.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/dashboard/sales/${so.id}`)}
                    >
                      <TableCell className="font-mono font-semibold">
                        <Link
                          href={`/dashboard/sales/${so.id}`}
                          className="text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {so.order_number}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {so.customers?.id ? (
                          <Link
                            href={`/dashboard/sales/customers/${so.customers.id}`}
                            className="text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {so.customers.name}
                          </Link>
                        ) : (
                          so.customers?.name ?? '—'
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="rounded-full bg-muted px-3 py-1 text-xs text-app-text-secondary">
                          {statusLabel[so.status] ?? so.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <p className="mt-4 text-sm text-app-text-muted">
            Open = all sales orders except <code className="text-xs">completed</code>,{' '}
            <code className="text-xs">cancelled</code>, <code className="text-xs">rejected</code>, and{' '}
            <code className="text-xs">deleted</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
