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
import { Badge } from '@/components/ui/badge'
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
import { ArrowUpDown, Filter, Search } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'

type WoRow = {
  id: string
  wo_number: string
  status: string
  created_at?: string
  sales_orders?: { order_number: string } | null
  work_order_lines?: Array<{
    qty_ordered: number
    qty_produced: number
    items?: { name: string; sku: string } | null
  }>
}

const statusLabel: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  paused: 'Paused',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const WO_STATUS_KEYS = Object.keys(statusLabel) as Array<keyof typeof statusLabel>

type WoStatusFilter = 'all' | WoRow['status']

type WoSortOption =
  | 'created_desc'
  | 'created_asc'
  | 'wo_number_asc'
  | 'wo_number_desc'
  | 'so_number_asc'
  | 'so_number_desc'
  | 'status_asc'
  | 'status_desc'

const SORT_LABELS: Record<WoSortOption, string> = {
  created_desc: 'Created (newest first)',
  created_asc: 'Created (oldest first)',
  wo_number_asc: 'WO number (A–Z)',
  wo_number_desc: 'WO number (Z–A)',
  so_number_asc: 'Sales order (A–Z)',
  so_number_desc: 'Sales order (Z–A)',
  status_asc: 'Status (A–Z)',
  status_desc: 'Status (Z–A)',
}

function woMatchesSearch(wo: WoRow, q: string): boolean {
  const s = q.trim().toLowerCase()
  if (!s) return true
  if (wo.wo_number.toLowerCase().includes(s)) return true
  if ((wo.sales_orders?.order_number ?? '').toLowerCase().includes(s)) return true
  if (wo.status.toLowerCase().includes(s)) return true
  if ((statusLabel[wo.status] ?? '').toLowerCase().includes(s)) return true
  for (const l of wo.work_order_lines ?? []) {
    if ((l.items?.sku ?? '').toLowerCase().includes(s)) return true
    if ((l.items?.name ?? '').toLowerCase().includes(s)) return true
  }
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

export default function WorkOrdersPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [rows, setRows] = useState<WoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<WoStatusFilter>('all')
  const [sortBy, setSortBy] = useState<WoSortOption>('created_desc')

  useEffect(() => {
    void load()
  }, [])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await erpFetch<{ data: WoRow[] }>('/api/work-orders')
      setRows(res.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  const searched = useMemo(() => rows.filter((o) => woMatchesSearch(o, searchTerm)), [rows, searchTerm])

  const displayed = useMemo(() => {
    let r = [...searched]
    if (statusFilter !== 'all') r = r.filter((w) => w.status === statusFilter)

    const dir = sortBy.endsWith('_desc') ? 'desc' : 'asc'
    const key = sortBy.replace(/_asc$|_desc$/, '') as string

    r.sort((a, b) => {
      switch (key) {
        case 'created':
          return cmpTime(a.created_at ?? '', b.created_at ?? '', dir)
        case 'wo_number':
          return cmpStr(a.wo_number, b.wo_number, dir)
        case 'so_number':
          return cmpStr(a.sales_orders?.order_number ?? '', b.sales_orders?.order_number ?? '', dir)
        case 'status':
          return cmpStr(statusLabel[a.status] ?? a.status, statusLabel[b.status] ?? b.status, dir)
        default:
          return 0
      }
    })
    return r
  }, [searched, statusFilter, sortBy])

  const filterActive = statusFilter !== 'all'

  const WorkOrderLink = ({ wo, children }: { wo: WoRow; children: React.ReactNode }) => (
    <Button asChild variant="ghost" className="h-auto p-0 font-normal">
      <Link href={`/dashboard/manufacturing/work-orders/${wo.id}`}>{children}</Link>
    </Button>
  )

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Work orders</h1>
        <p className="text-gray-600 mt-2">Open a row for details, material entries, and shipping.</p>
      </div>

      {error && (
        <p className="text-sm text-red-600 mb-4">
          {error}. Set NEXT_PUBLIC_ERP_API_URL and run ERP-Backend.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All work orders</CardTitle>
          <CardDescription>
            {!loading && (
              <span className="block text-xs text-muted-foreground mt-1">
                Showing {displayed.length} of {rows.length}
                {searchTerm.trim() ? ` · matching “${searchTerm.trim()}”` : ''}
                {filterActive || sortBy !== 'created_desc' ? ` · ${SORT_LABELS[sortBy]}` : ''}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex-1 relative min-w-0">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <Input
                placeholder="Search WO, sales order, line SKU/name, or status…"
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
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel>Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup
                    value={statusFilter}
                    onValueChange={(v) => setStatusFilter(v as WoStatusFilter)}
                  >
                    <DropdownMenuRadioItem value="all">All statuses</DropdownMenuRadioItem>
                    {WO_STATUS_KEYS.map((k) => (
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
                  <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => setSortBy(v as WoSortOption)}>
                    <DropdownMenuRadioItem value="created_desc">{SORT_LABELS.created_desc}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="created_asc">{SORT_LABELS.created_asc}</DropdownMenuRadioItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioItem value="wo_number_asc">{SORT_LABELS.wo_number_asc}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="wo_number_desc">{SORT_LABELS.wo_number_desc}</DropdownMenuRadioItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioItem value="so_number_asc">{SORT_LABELS.so_number_asc}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="so_number_desc">{SORT_LABELS.so_number_desc}</DropdownMenuRadioItem>
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
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>WO</TableHead>
                  <TableHead>Sales order</TableHead>
                  <TableHead>Lines</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4}>Loading…</TableCell>
                  </TableRow>
                ) : displayed.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      {rows.length === 0 ? 'No work orders yet.' : 'No work orders match your search or filters.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  displayed.map((wo) => {
                    const lines = wo.work_order_lines ?? []
                    const summary = lines
                      .map(
                        (l) =>
                          `${l.items?.sku ?? ''}: ${Number(l.qty_produced)}/${Number(l.qty_ordered)}`,
                      )
                      .join('; ')
                    return (
                      <TableRow key={wo.id}>
                        <TableCell className="font-mono font-semibold">
                          <WorkOrderLink wo={wo}>{wo.wo_number}</WorkOrderLink>
                        </TableCell>
                        <TableCell className="font-mono">
                          <WorkOrderLink wo={wo}>{wo.sales_orders?.order_number ?? '—'}</WorkOrderLink>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-md truncate">
                          <WorkOrderLink wo={wo}>{summary || '—'}</WorkOrderLink>
                        </TableCell>
                        <TableCell>
                          <WorkOrderLink wo={wo}>
                            <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-normal">
                              {statusLabel[wo.status] ?? wo.status}
                            </Badge>
                          </WorkOrderLink>
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
    </div>
  )
}
