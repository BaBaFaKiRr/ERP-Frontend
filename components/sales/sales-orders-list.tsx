'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowLeft, ArrowUpDown, Filter, Plus, Search } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { cn } from '@/lib/utils'

type SalesOrderRow = {
  id: string
  order_number: string
  status: string
  order_date: string
  delivery_date?: string | null
  total_amount?: number | null
  customers?: { id?: string; name: string } | null
}

const statusLabel: Record<string, string> = {
  draft: 'Draft',
  pending_approval: 'Pending approval',
  approved: 'Approved',
  pending_work_order: 'Pending work order',
  work_order_open: 'Manufacturing...',
  in_progress: 'In progress',
  partially_shipped: 'Partially shipped',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
  deleted: 'Deleted',
}

const STATUS_FILTER_KEYS = Object.keys(statusLabel) as Array<keyof typeof statusLabel>

type SalesStatusFilter = 'all' | SalesOrderRow['status']

type SalesSortOption =
  | 'order_number_asc'
  | 'order_number_desc'
  | 'customer_asc'
  | 'customer_desc'
  | 'date_asc'
  | 'date_desc'
  | 'amount_asc'
  | 'amount_desc'
  | 'status_asc'
  | 'status_desc'

const SORT_LABELS: Record<SalesSortOption, string> = {
  order_number_asc: 'Order number (A–Z)',
  order_number_desc: 'Order number (Z–A)',
  customer_asc: 'Customer (A–Z)',
  customer_desc: 'Customer (Z–A)',
  date_asc: 'Order date (oldest first)',
  date_desc: 'Order date (newest first)',
  amount_asc: 'Amount (low → high)',
  amount_desc: 'Amount (high → low)',
  status_asc: 'Status (A–Z)',
  status_desc: 'Status (Z–A)',
}

function statusBadgeClass(status: string) {
  if (status === 'rejected') return 'bg-red-100 text-red-800'
  if (status === 'deleted') return 'bg-slate-200 text-slate-700'
  if (status === 'pending_approval') return 'bg-amber-100 text-amber-900'
  if (status === 'cancelled') return 'bg-gray-200 text-gray-700'
  return 'bg-gray-100 text-gray-800'
}

function orderMatchesSearch(o: SalesOrderRow, q: string): boolean {
  const s = q.trim().toLowerCase()
  if (!s) return true
  if (o.order_number.toLowerCase().includes(s)) return true
  if ((o.customers?.name ?? '').toLowerCase().includes(s)) return true
  if (o.status.toLowerCase().includes(s)) return true
  if ((statusLabel[o.status] ?? '').toLowerCase().includes(s)) return true
  const amt = o.total_amount != null ? String(o.total_amount) : ''
  if (amt.includes(s)) return true
  return false
}

function cmpStr(a: string, b: string, dir: 'asc' | 'desc') {
  const x = a.localeCompare(b, undefined, { sensitivity: 'base' })
  return dir === 'asc' ? x : -x
}

function cmpTime(a: string, b: string, dir: 'asc' | 'desc') {
  const ta = new Date(a).getTime()
  const tb = new Date(b).getTime()
  const na = Number.isFinite(ta) ? ta : 0
  const nb = Number.isFinite(tb) ? tb : 0
  return dir === 'asc' ? na - nb : nb - na
}

function cmpNum(a: number, b: number, dir: 'asc' | 'desc') {
  return dir === 'asc' ? a - b : b - a
}

export type SalesOrdersListProps = {
  /** When null, the back button is hidden. Defaults to /dashboard/sales */
  backHref?: string | null
}

function SalesOrdersListContent({ backHref = '/dashboard/sales' }: SalesOrdersListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialStatus = searchParams.get('status')

  const [searchTerm, setSearchTerm] = useState('')
  const [orders, setOrders] = useState<SalesOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<SalesStatusFilter>(
    initialStatus && initialStatus in statusLabel ? (initialStatus as SalesStatusFilter) : 'all',
  )
  const [sortBy, setSortBy] = useState<SalesSortOption>('date_desc')

  useEffect(() => {
    void load()
  }, [])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await erpFetch<{ data: SalesOrderRow[] }>('/api/sales-orders')
      setOrders(res.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  const searched = useMemo(
    () => orders.filter((o) => orderMatchesSearch(o, searchTerm)),
    [orders, searchTerm],
  )

  const displayed = useMemo(() => {
    let r = [...searched]
    if (statusFilter !== 'all') r = r.filter((o) => o.status === statusFilter)

    const dir = sortBy.endsWith('_desc') ? 'desc' : 'asc'
    const key = sortBy.replace(/_asc$|_desc$/, '') as string

    r.sort((a, b) => {
      switch (key) {
        case 'order_number':
          return cmpStr(a.order_number, b.order_number, dir)
        case 'customer':
          return cmpStr(a.customers?.name ?? '', b.customers?.name ?? '', dir)
        case 'date':
          return cmpTime(a.order_date, b.order_date, dir)
        case 'amount': {
          const na = a.total_amount == null ? (dir === 'asc' ? Infinity : -Infinity) : Number(a.total_amount)
          const nb = b.total_amount == null ? (dir === 'asc' ? Infinity : -Infinity) : Number(b.total_amount)
          return cmpNum(na, nb, dir)
        }
        case 'status':
          return cmpStr(statusLabel[a.status] ?? a.status, statusLabel[b.status] ?? b.status, dir)
        default:
          return 0
      }
    })
    return r
  }, [searched, statusFilter, sortBy])

  const filterActive = statusFilter !== 'all'

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-8">
        <div className="flex items-start gap-4">
          {backHref !== null ? (
            <Button variant="ghost" size="sm" asChild className="mt-1">
              <Link href={backHref}>
                <ArrowLeft size={18} />
              </Link>
            </Button>
          ) : null}
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Sales orders</h1>
            <p className="text-gray-600 mt-2">Create and approve sales orders (SL-YYYY-NNNNN)</p>
          </div>
        </div>
        <Button asChild className="flex items-center gap-2">
          <Link href="/dashboard/sales/create">
            <Plus size={18} />
            Create sales order
          </Link>
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-600 mb-4">
          {error}. Set NEXT_PUBLIC_ERP_API_URL and run ERP-Backend.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
          <CardDescription>
            {!loading && (
              <span className="block text-xs text-muted-foreground mt-1">
                Showing {displayed.length} of {orders.length} orders
                {searchTerm.trim() ? ` · matching “${searchTerm.trim()}”` : ''}
                {filterActive || sortBy !== 'date_desc' ? ` · ${SORT_LABELS[sortBy]}` : ''}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex-1 relative min-w-0">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <Input
                placeholder="Search order number, customer, status, or amount…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" className="gap-2">
                    <Filter className="size-4" />
                    Filter
                    {filterActive ? (
                      <span className="ml-1 rounded-full bg-primary/15 px-1.5 text-[10px] font-medium text-primary">
                        on
                      </span>
                    ) : null}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-h-[min(24rem,70vh)] w-56 overflow-y-auto">
                  <DropdownMenuLabel>Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup
                    value={statusFilter}
                    onValueChange={(v) => setStatusFilter(v as SalesStatusFilter)}
                  >
                    <DropdownMenuRadioItem value="all">All statuses</DropdownMenuRadioItem>
                    {STATUS_FILTER_KEYS.map((k) => (
                      <DropdownMenuRadioItem key={k} value={k}>
                        {statusLabel[k]}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" className="gap-2">
                    <ArrowUpDown className="size-4" />
                    Sort
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => setSortBy(v as SalesSortOption)}>
                    <DropdownMenuRadioItem value="date_desc">{SORT_LABELS.date_desc}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="date_asc">{SORT_LABELS.date_asc}</DropdownMenuRadioItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioItem value="order_number_asc">{SORT_LABELS.order_number_asc}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="order_number_desc">{SORT_LABELS.order_number_desc}</DropdownMenuRadioItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioItem value="customer_asc">{SORT_LABELS.customer_asc}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="customer_desc">{SORT_LABELS.customer_desc}</DropdownMenuRadioItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioItem value="amount_desc">{SORT_LABELS.amount_desc}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="amount_asc">{SORT_LABELS.amount_asc}</DropdownMenuRadioItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioItem value="status_asc">{SORT_LABELS.status_asc}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="status_desc">{SORT_LABELS.status_desc}</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button type="button" variant="outline" onClick={() => void load()}>
                Refresh
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 dark:bg-muted/20 hover:bg-muted/40 dark:hover:bg-muted/20">
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount (INR)</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5}>Loading…</TableCell>
                  </TableRow>
                ) : displayed.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      {orders.length === 0
                        ? 'No sales orders yet.'
                        : 'No orders match your search or filters.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  displayed.map((order) => (
                    <TableRow
                      key={order.id}
                      className={cn('cursor-pointer', order.status === 'deleted' && 'opacity-70')}
                      onClick={() => router.push(`/dashboard/sales/${order.id}`)}
                    >
                      <TableCell className="font-mono font-semibold">
                        <Link
                          href={`/dashboard/sales/${order.id}`}
                          className="text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {order.order_number}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {order.customers?.id ? (
                          <Link
                            href={`/dashboard/sales/customers/${order.customers.id}`}
                            className="text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {order.customers.name}
                          </Link>
                        ) : (
                          order.customers?.name ?? '—'
                        )}
                      </TableCell>
                      <TableCell>
                        {order.order_date ? new Date(order.order_date).toLocaleDateString('en-GB') : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {order.total_amount != null ? `₹${Number(order.total_amount).toFixed(2)}` : '—'}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'text-xs px-3 py-1 rounded-full font-medium',
                            statusBadgeClass(order.status),
                          )}
                        >
                          {statusLabel[order.status] ?? order.status}
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

export function SalesOrdersList(props: SalesOrdersListProps) {
  return (
    <Suspense fallback={<div className="p-8 text-muted-foreground">Loading sales orders…</div>}>
      <SalesOrdersListContent {...props} />
    </Suspense>
  )
}
