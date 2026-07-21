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
import { Badge } from '@/components/ui/badge'
import { ArrowUpDown, ArrowRightLeft, ClipboardList, Filter, Plus, Search } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { cn } from '@/lib/utils'
import { GenerateReportButton } from '@/components/reports/generate-report-button'

type LineRow = {
  id: string
  item_id: string
  direction: 'in' | 'out'
  quantity: number
  items?: { sku: string; name: string } | null
}

type StockEntryRow = {
  id: string
  se_number: string
  purpose: string
  created_at: string
  store_employee_name: string | null
  notes: string | null
  deleted_at?: string | null
  material_issue_requests?: { request_number?: string | null } | null
  stock_entry_lines?: LineRow[] | null
}

const PURPOSE_LABEL: Record<string, string> = {
  adjustment: 'Adjustment',
  issue_raw_material: 'Issue (raw material)',
  receipt_fg: 'Receipt (finished goods)',
  receipt_purchase: 'Receipt (purchase)',
  dispatch_sales: 'Dispatch (sales)',
  wastage_movement: 'Wastage movement',
  warehouse_transfer: 'Warehouse transfer',
}

const PURPOSE_KEYS = Object.keys(PURPOSE_LABEL) as Array<keyof typeof PURPOSE_LABEL>

function formatPurpose(p: string) {
  return PURPOSE_LABEL[p] ?? p.replace(/_/g, ' ')
}

function linesSummary(lines: LineRow[] | null | undefined) {
  if (!lines?.length) return '—'
  return lines
    .map((l) => {
      const sign = l.direction === 'in' ? '+' : '−'
      const sku = l.items?.sku ?? `${l.item_id.slice(0, 8)}…`
      return `${sign}${l.quantity} ${sku}`
    })
    .join(', ')
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

function entryMatchesSearch(row: StockEntryRow, q: string): boolean {
  const s = q.trim().toLowerCase()
  if (!s) return true
  if (row.se_number.toLowerCase().includes(s)) return true
  const mir = (row.material_issue_requests?.request_number ?? '').toLowerCase()
  if (mir && mir.includes(s)) return true
  const op = (row.store_employee_name ?? '').toLowerCase()
  if (op.includes(s)) return true
  const notes = (row.notes ?? '').toLowerCase()
  if (notes.includes(s)) return true
  if (formatPurpose(row.purpose).toLowerCase().includes(s)) return true
  if (row.purpose.toLowerCase().includes(s)) return true
  for (const line of row.stock_entry_lines ?? []) {
    const sku = (line.items?.sku ?? '').toLowerCase()
    const name = (line.items?.name ?? '').toLowerCase()
    const idFrag = line.item_id.toLowerCase()
    if (sku.includes(s) || name.includes(s) || idFrag.includes(s)) return true
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

type DeletedFilter = 'all' | 'active' | 'deleted'

type PurposeFilter = 'all' | (typeof PURPOSE_KEYS)[number]

type StockEntrySortOption =
  | 'se_number_asc'
  | 'se_number_desc'
  | 'created_asc'
  | 'created_desc'
  | 'purpose_asc'
  | 'purpose_desc'
  | 'operator_asc'
  | 'operator_desc'

const SORT_LABELS: Record<StockEntrySortOption, string> = {
  se_number_asc: 'Entry number (A–Z)',
  se_number_desc: 'Entry number (Z–A)',
  created_asc: 'Date (oldest first)',
  created_desc: 'Date (newest first)',
  purpose_asc: 'Purpose (A–Z)',
  purpose_desc: 'Purpose (Z–A)',
  operator_asc: 'Operator (A–Z)',
  operator_desc: 'Operator (Z–A)',
}

export default function StockEntriesListPage() {
  const router = useRouter()
  const [entries, setEntries] = useState<StockEntryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [deletedFilter, setDeletedFilter] = useState<DeletedFilter>('all')
  const [purposeFilter, setPurposeFilter] = useState<PurposeFilter>('all')
  const [sortBy, setSortBy] = useState<StockEntrySortOption>('created_desc')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await erpFetch<{ data: StockEntryRow[] }>('/api/stock-entries')
      setEntries(res.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load stock entries')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const searched = useMemo(
    () => entries.filter((row) => entryMatchesSearch(row, search)),
    [entries, search],
  )

  const displayed = useMemo(() => {
    let r = [...searched]
    if (deletedFilter === 'active') r = r.filter((x) => !x.deleted_at)
    else if (deletedFilter === 'deleted') r = r.filter((x) => !!x.deleted_at)
    if (purposeFilter !== 'all') r = r.filter((x) => x.purpose === purposeFilter)

    const dir = sortBy.endsWith('_desc') ? 'desc' : 'asc'
    const key = sortBy.replace(/_asc$|_desc$/, '') as string

    r.sort((a, b) => {
      switch (key) {
        case 'se_number':
          return cmpStr(a.se_number, b.se_number, dir)
        case 'created':
          return cmpTime(a.created_at, b.created_at, dir)
        case 'purpose':
          return cmpStr(formatPurpose(a.purpose), formatPurpose(b.purpose), dir)
        case 'operator':
          return cmpStr(a.store_employee_name ?? '', b.store_employee_name ?? '', dir)
        default:
          return 0
      }
    })
    return r
  }, [searched, deletedFilter, purposeFilter, sortBy])

  const filterBits = (deletedFilter !== 'all' ? 1 : 0) + (purposeFilter !== 'all' ? 1 : 0)

  return (
    <div className="p-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Stock entries</h1>
          <p className="text-gray-600 mt-2">
            All stock movements posted to the ledger. Manual entries use <strong>Adjustment</strong> and
            update on-hand quantities immediately.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <GenerateReportButton reportType="stock_entries" />
          <Button variant="outline" className="flex items-center gap-2" asChild>
            <Link href="/dashboard/inventory/stock-entries/transfer">
              <ArrowRightLeft size={18} />
              Transfer
            </Link>
          </Button>
          <Button className="flex items-center gap-2" asChild>
            <Link href="/dashboard/inventory/stock-entries/new">
              <Plus size={18} />
              Create stock entry
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 mb-4">
          {error}. Set NEXT_PUBLIC_ERP_API_URL and run ERP-Backend.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList size={22} />
            Entry log
          </CardTitle>
          <CardDescription>
            Document numbers follow SE-YYYY-NNNNN-SSS.
            {!loading && (
              <span className="block mt-1 text-xs text-muted-foreground">
                Showing {displayed.length} of {entries.length} entries
                {search.trim() ? ` · matching “${search.trim()}”` : ''}
                {filterBits > 0 || sortBy !== 'created_desc' ? (
                  <>
                    {' '}
                    · {SORT_LABELS[sortBy]}
                  </>
                ) : null}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-3 text-muted-foreground" size={18} />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                placeholder="Search by entry number, item SKU/name, store operator, or purpose…"
              />
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" className="gap-2">
                    <Filter className="size-4" />
                    Filter
                    {filterBits > 0 ? (
                      <span className="ml-1 rounded-full bg-primary/15 px-1.5 text-[10px] font-medium text-primary">
                        {filterBits}
                      </span>
                    ) : null}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel>Record status</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={deletedFilter}
                    onValueChange={(v) => setDeletedFilter(v as DeletedFilter)}
                  >
                    <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="active">Active only</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="deleted">Deleted only</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Purpose</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={purposeFilter}
                    onValueChange={(v) => setPurposeFilter(v as PurposeFilter)}
                  >
                    <DropdownMenuRadioItem value="all">All purposes</DropdownMenuRadioItem>
                    {PURPOSE_KEYS.map((k) => (
                      <DropdownMenuRadioItem key={k} value={k}>
                        {PURPOSE_LABEL[k]}
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
                  <DropdownMenuRadioGroup
                    value={sortBy}
                    onValueChange={(v) => setSortBy(v as StockEntrySortOption)}
                  >
                    <DropdownMenuRadioItem value="created_desc">{SORT_LABELS.created_desc}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="created_asc">{SORT_LABELS.created_asc}</DropdownMenuRadioItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioItem value="se_number_asc">{SORT_LABELS.se_number_asc}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="se_number_desc">{SORT_LABELS.se_number_desc}</DropdownMenuRadioItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioItem value="purpose_asc">{SORT_LABELS.purpose_asc}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="purpose_desc">{SORT_LABELS.purpose_desc}</DropdownMenuRadioItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioItem value="operator_asc">{SORT_LABELS.operator_asc}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="operator_desc">{SORT_LABELS.operator_desc}</DropdownMenuRadioItem>
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
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>MIR No.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Lines</TableHead>
                  <TableHead>Store / operator</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7}>Loading…</TableCell>
                  </TableRow>
                ) : displayed.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      {entries.length === 0
                        ? 'No stock entries yet. Create one to adjust on-hand stock.'
                        : 'No entries match your search or filters.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  displayed.map((row) => (
                    <TableRow
                      key={row.id}
                      role="button"
                      tabIndex={0}
                      className={cn(
                        'cursor-pointer hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                        row.deleted_at && 'opacity-70',
                      )}
                      onClick={() => router.push(`/dashboard/inventory/stock-entries/${row.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          router.push(`/dashboard/inventory/stock-entries/${row.id}`)
                        }
                      }}
                    >
                      <TableCell className="font-mono font-medium">{row.se_number}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.material_issue_requests?.request_number ? (
                          <span className="font-mono">{row.material_issue_requests.request_number}</span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        {row.deleted_at ? (
                          <Badge variant="secondary" className="font-normal text-amber-900 bg-amber-100">
                            Deleted
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">Active</span>
                        )}
                      </TableCell>
                      <TableCell>{formatPurpose(row.purpose)}</TableCell>
                      <TableCell className="max-w-md text-sm text-muted-foreground">
                        {linesSummary(row.stock_entry_lines ?? undefined)}
                      </TableCell>
                      <TableCell>{row.store_employee_name ?? '—'}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDate(row.created_at)}
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
