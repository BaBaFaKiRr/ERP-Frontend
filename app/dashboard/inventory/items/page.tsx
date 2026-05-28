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
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { ArrowUpDown, Download, EllipsisVertical, Filter, PackagePlus, Search, Upload } from 'lucide-react'
import { erpFetch, erpFetchBlob, downloadBlob } from '@/lib/erp-api'

type ItemRow = {
  id: string
  sku: string
  name: string
  item_type: string
  fg_category: string | null
  uom: string
  standard_cost: number | null
  standard_cost_uom: string | null
  hsn: string | null
  cost_per_unit: number | null
  price_per_unit: number | null
  mrp: number | null
  reorder_level: number
  reserve_quantity: number
  track_inventory: boolean
  is_active: boolean
}

type ItemTypeFilter =
  | 'all'
  | 'finished_good'
  | 'semi_finished'
  | 'raw_material'
  | 'packaging'
  | 'service'

type ItemActiveFilter = 'all' | 'active' | 'inactive'

type ItemTrackFilter = 'all' | 'yes' | 'no'

type ItemSortOption =
  | 'sku_asc'
  | 'sku_desc'
  | 'name_asc'
  | 'name_desc'
  | 'type_asc'
  | 'type_desc'
  | 'reorder_asc'
  | 'reorder_desc'
  | 'std_cost_asc'
  | 'std_cost_desc'

const ITEM_TYPE_LABEL: Record<string, string> = {
  finished_good: 'Finished good',
  semi_finished: 'Semi-finished',
  raw_material: 'Raw material',
  packaging: 'Packaging',
  service: 'Service',
}

function formatItemType(t: string) {
  return ITEM_TYPE_LABEL[t] ?? t.replace(/_/g, ' ')
}

function formatStandardCost(cost: number | null, uom: string | null) {
  if (cost == null) return '—'
  const u = uom ?? 'pcs'
  return `${cost} INR / ${u}`
}

function formatInr(n: number | null) {
  if (n == null) return '—'
  return `₹${Number(n).toFixed(2)}`
}

function cmpStr(a: string, b: string, dir: 'asc' | 'desc') {
  const x = a.localeCompare(b, undefined, { sensitivity: 'base' })
  return dir === 'asc' ? x : -x
}

function cmpNum(a: number, b: number, dir: 'asc' | 'desc') {
  return dir === 'asc' ? a - b : b - a
}

export default function ItemsListPage() {
  const [items, setItems] = useState<ItemRow[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<ItemTypeFilter>('all')
  const [activeFilter, setActiveFilter] = useState<ItemActiveFilter>('all')
  const [trackFilter, setTrackFilter] = useState<ItemTrackFilter>('all')
  const [sortBy, setSortBy] = useState<ItemSortOption>('sku_asc')
  const [exportBusy, setExportBusy] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await erpFetch<{ data: ItemRow[] }>('/api/items')
      setItems(res.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load items')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const searched = useMemo(
    () =>
      items.filter(
        (r) =>
          r.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.name.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [items, searchTerm],
  )

  const displayed = useMemo(() => {
    let r = [...searched]
    if (typeFilter !== 'all') r = r.filter((x) => x.item_type === typeFilter)
    if (activeFilter === 'active') r = r.filter((x) => x.is_active)
    else if (activeFilter === 'inactive') r = r.filter((x) => !x.is_active)
    if (trackFilter === 'yes') r = r.filter((x) => x.track_inventory)
    else if (trackFilter === 'no') r = r.filter((x) => !x.track_inventory)

    const dir = sortBy.endsWith('_desc') ? 'desc' : 'asc'
    const key = sortBy.replace(/_asc$|_desc$/, '') as string

    r.sort((a, b) => {
      switch (key) {
        case 'sku':
          return cmpStr(a.sku, b.sku, dir)
        case 'name':
          return cmpStr(a.name, b.name, dir)
        case 'type':
          return cmpStr(a.item_type, b.item_type, dir)
        case 'reorder':
          return cmpNum(Number(a.reorder_level ?? 0), Number(b.reorder_level ?? 0), dir)
        case 'std_cost': {
          const na =
            a.standard_cost == null
              ? dir === 'asc'
                ? Number.POSITIVE_INFINITY
                : Number.NEGATIVE_INFINITY
              : Number(a.standard_cost)
          const nb =
            b.standard_cost == null
              ? dir === 'asc'
                ? Number.POSITIVE_INFINITY
                : Number.NEGATIVE_INFINITY
              : Number(b.standard_cost)
          return cmpNum(na, nb, dir)
        }
        default:
          return 0
      }
    })
    return r
  }, [searched, typeFilter, activeFilter, trackFilter, sortBy])

  const filterBits =
    (typeFilter !== 'all' ? 1 : 0) + (activeFilter !== 'all' ? 1 : 0) + (trackFilter !== 'all' ? 1 : 0)

  const runExport = async () => {
    setExportBusy(true)
    setError(null)
    try {
      const { blob, filename } = await erpFetchBlob('/api/data-import-export/export', {
        method: 'POST',
        body: { segment: 'items', constraints: {} },
      })
      downloadBlob(blob, filename ?? 'items-export.csv')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setExportBusy(false)
    }
  }

  const sortLabel: Record<ItemSortOption, string> = {
    sku_asc: 'SKU (A–Z)',
    sku_desc: 'SKU (Z–A)',
    name_asc: 'Name (A–Z)',
    name_desc: 'Name (Z–A)',
    type_asc: 'Type (A–Z)',
    type_desc: 'Type (Z–A)',
    reorder_asc: 'Reorder level (low → high)',
    reorder_desc: 'Reorder level (high → low)',
    std_cost_asc: 'Standard cost (low → high)',
    std_cost_desc: 'Standard cost (high → low)',
  }

  return (
    <div className="p-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Items</h1>
          <p className="text-gray-600 mt-2">
            Master catalog — SKUs used on sales orders, purchasing, and manufacturing.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="icon" aria-label="More item actions">
                <EllipsisVertical className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                disabled={exportBusy}
                onSelect={(e) => {
                  e.preventDefault()
                  void runExport()
                }}
              >
                <Download className="mr-2 size-4" />
                {exportBusy ? 'Exporting…' : 'Export items'}
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/import-export?segment=items&action=import">
                  <Upload className="mr-2 size-4" />
                  Import items
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button className="flex items-center gap-2" asChild>
            <Link href="/dashboard/inventory/items/new">
              <PackagePlus size={18} />
              Create Item
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
          <CardTitle>All items</CardTitle>
          <CardDescription>
            Finished goods show HSN and commercial pricing; other types show standard cost where set.
            {!loading && (
              <span className="block mt-1 text-xs text-muted-foreground">
                Showing {displayed.length} of {items.length} items
                {filterBits > 0 || sortBy !== 'sku_asc' ? (
                  <>
                    {' '}
                    · {sortLabel[sortBy]}
                  </>
                ) : null}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex-1 relative min-w-0">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <Input
                placeholder="Search SKU or name…"
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
                    {filterBits > 0 ? (
                      <span className="ml-1 rounded-full bg-primary/15 px-1.5 text-[10px] font-medium text-primary">
                        {filterBits}
                      </span>
                    ) : null}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel>Item type</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={typeFilter}
                    onValueChange={(v) => setTypeFilter(v as ItemTypeFilter)}
                  >
                    <DropdownMenuRadioItem value="all">All types</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="finished_good">
                      {ITEM_TYPE_LABEL.finished_good}
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="semi_finished">
                      {ITEM_TYPE_LABEL.semi_finished}
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="raw_material">
                      {ITEM_TYPE_LABEL.raw_material}
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="packaging">{ITEM_TYPE_LABEL.packaging}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="service">{ITEM_TYPE_LABEL.service}</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Record status</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={activeFilter}
                    onValueChange={(v) => setActiveFilter(v as ItemActiveFilter)}
                  >
                    <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="active">Active only</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="inactive">Inactive only</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Track inventory</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={trackFilter}
                    onValueChange={(v) => setTrackFilter(v as ItemTrackFilter)}
                  >
                    <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="yes">Track stock: Yes</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="no">Track stock: No</DropdownMenuRadioItem>
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
                  <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => setSortBy(v as ItemSortOption)}>
                    <DropdownMenuRadioItem value="sku_asc">{sortLabel.sku_asc}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="sku_desc">{sortLabel.sku_desc}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="name_asc">{sortLabel.name_asc}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="name_desc">{sortLabel.name_desc}</DropdownMenuRadioItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioItem value="type_asc">{sortLabel.type_asc}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="type_desc">{sortLabel.type_desc}</DropdownMenuRadioItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioItem value="reorder_asc">{sortLabel.reorder_asc}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="reorder_desc">{sortLabel.reorder_desc}</DropdownMenuRadioItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioItem value="std_cost_asc">{sortLabel.std_cost_asc}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="std_cost_desc">{sortLabel.std_cost_desc}</DropdownMenuRadioItem>
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
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead className="font-mono text-xs">HSN</TableHead>
                  <TableHead className="text-right">Cost / unit</TableHead>
                  <TableHead className="text-right">Price / unit</TableHead>
                  <TableHead className="text-right">MRP</TableHead>
                  <TableHead className="text-right">Std. cost</TableHead>
                  <TableHead className="text-right">Reorder</TableHead>
                  <TableHead className="text-center">Track stock</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={13}>Loading…</TableCell>
                  </TableRow>
                ) : displayed.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13}>
                      {items.length === 0
                        ? 'No items yet. Create your first item to get started.'
                        : 'No items match your search or filters.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  displayed.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono">
                        <Link
                          href={`/dashboard/inventory/items/${r.id}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {r.sku}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/dashboard/inventory/items/${r.id}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                        >
                          {r.name}
                        </Link>
                      </TableCell>
                      <TableCell className="capitalize">{formatItemType(r.item_type)}</TableCell>
                      <TableCell className="text-sm">
                        {r.item_type === 'finished_good' && r.fg_category?.trim()
                          ? r.fg_category
                          : '—'}
                      </TableCell>
                      <TableCell>{r.uom}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {r.hsn?.trim() ? r.hsn : '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {formatInr(r.cost_per_unit)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {formatInr(r.price_per_unit)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {formatInr(r.mrp)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs">
                        {formatStandardCost(r.standard_cost, r.standard_cost_uom)}
                      </TableCell>
                      <TableCell className="text-right">{r.reorder_level}</TableCell>
                      <TableCell className="text-center">{r.track_inventory ? 'Yes' : 'No'}</TableCell>
                      <TableCell className="text-center">{r.is_active ? 'Yes' : 'No'}</TableCell>
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
