'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowUpDown, Filter, Plus, Search } from 'lucide-react'

import { erpFetch } from '@/lib/erp-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type BomRow = {
  id: string
  bom_code: string
  is_active: boolean
  is_default: boolean
  item?: { id: string; sku: string; name: string } | null
  total_cost: number
}

type BomStatusFilter = 'all' | 'active' | 'inactive' | 'default_only'

type BomSortOption =
  | 'bom_code_asc'
  | 'bom_code_desc'
  | 'item_sku_asc'
  | 'item_sku_desc'
  | 'item_name_asc'
  | 'item_name_desc'
  | 'total_cost_asc'
  | 'total_cost_desc'
  | 'status_asc'
  | 'status_desc'

function formatStatus(row: BomRow) {
  if (row.is_active && row.is_default) return 'Default'
  return row.is_active ? 'Active' : 'Inactive'
}

function cmpStr(a: string, b: string, dir: 'asc' | 'desc') {
  const x = a.localeCompare(b, undefined, { sensitivity: 'base' })
  return dir === 'asc' ? x : -x
}

function cmpNum(a: number, b: number, dir: 'asc' | 'desc') {
  return dir === 'asc' ? a - b : b - a
}

export default function BomListPage() {
  const [rows, setRows] = useState<BomRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<BomStatusFilter>('all')
  const [sortBy, setSortBy] = useState<BomSortOption>('bom_code_asc')

  const load = async (query = '') => {
    setLoading(true)
    setError(null)
    try {
      const suffix = query.trim() ? `?search=${encodeURIComponent(query.trim())}` : ''
      const res = await erpFetch<{ data: BomRow[] }>(`/api/bom${suffix}`)
      setRows(res.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load BOMs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      void load(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const displayed = useMemo(() => {
    let r = [...rows]
    if (statusFilter === 'active') r = r.filter((x) => x.is_active)
    else if (statusFilter === 'inactive') r = r.filter((x) => !x.is_active)
    else if (statusFilter === 'default_only') r = r.filter((x) => x.is_default && x.is_active)

    const dir = sortBy.endsWith('_desc') ? 'desc' : 'asc'
    const key = sortBy.replace(/_asc$|_desc$/, '') as string

    r.sort((a, b) => {
      switch (key) {
        case 'bom_code':
          return cmpStr(a.bom_code, b.bom_code, dir)
        case 'item_sku':
          return cmpStr(a.item?.sku ?? '', b.item?.sku ?? '', dir)
        case 'item_name':
          return cmpStr(a.item?.name ?? '', b.item?.name ?? '', dir)
        case 'total_cost':
          return cmpNum(Number(a.total_cost ?? 0), Number(b.total_cost ?? 0), dir)
        case 'status':
          return cmpStr(formatStatus(a), formatStatus(b), dir)
        default:
          return 0
      }
    })
    return r
  }, [rows, statusFilter, sortBy])

  const totalCount = rows.length
  const shownCount = displayed.length
  const filterActive = statusFilter !== 'all'

  const filterSummary =
    statusFilter === 'all'
      ? 'All statuses'
      : statusFilter === 'active'
        ? 'Active only'
        : statusFilter === 'inactive'
          ? 'Inactive only'
          : 'Default BOMs only'

  const sortLabel: Record<BomSortOption, string> = {
    bom_code_asc: 'BOM code (A–Z)',
    bom_code_desc: 'BOM code (Z–A)',
    item_sku_asc: 'Item SKU (A–Z)',
    item_sku_desc: 'Item SKU (Z–A)',
    item_name_asc: 'Item name (A–Z)',
    item_name_desc: 'Item name (Z–A)',
    total_cost_asc: 'Total cost (low → high)',
    total_cost_desc: 'Total cost (high → low)',
    status_asc: 'Status (A–Z)',
    status_desc: 'Status (Z–A)',
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Bill of Materials (BOM)</h1>
          <p className="text-muted-foreground mt-2">
            Manage BOMs for finished and semi-finished items.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/inventory/bom/new">
            <Plus size={16} className="mr-2" />
            Create BOM
          </Link>
        </Button>
      </div>

      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Available BOMs</CardTitle>
          <CardDescription>
            {loading
              ? 'Loading…'
              : shownCount === totalCount
                ? `${totalCount} BOM(s)`
                : `${shownCount} of ${totalCount} BOM(s) after filter`}
            {filterActive || sortBy !== 'bom_code_asc' ? (
              <span className="block mt-1 text-xs text-muted-foreground">
                {filterSummary} · {sortLabel[sortBy]}
              </span>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-3 text-muted-foreground" size={16} />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                placeholder="Search by BOM ID, parent item SKU/name, or raw material..."
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
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Filter by status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup
                    value={statusFilter}
                    onValueChange={(v) => setStatusFilter(v as BomStatusFilter)}
                  >
                    <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="active">Active only</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="inactive">Inactive only</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="default_only">Default BOMs only</DropdownMenuRadioItem>
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
                  <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => setSortBy(v as BomSortOption)}>
                    <DropdownMenuRadioItem value="bom_code_asc">{sortLabel.bom_code_asc}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="bom_code_desc">{sortLabel.bom_code_desc}</DropdownMenuRadioItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioItem value="item_sku_asc">{sortLabel.item_sku_asc}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="item_sku_desc">{sortLabel.item_sku_desc}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="item_name_asc">{sortLabel.item_name_asc}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="item_name_desc">{sortLabel.item_name_desc}</DropdownMenuRadioItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioItem value="total_cost_asc">{sortLabel.total_cost_asc}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="total_cost_desc">{sortLabel.total_cost_desc}</DropdownMenuRadioItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioItem value="status_asc">{sortLabel.status_asc}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="status_desc">{sortLabel.status_desc}</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
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
                    {rows.length === 0 ? 'No BOMs found.' : 'No BOMs match the current filter.'}
                  </TableCell>
                </TableRow>
              ) : (
                displayed.map((row) => (
                  <TableRow key={row.id} className="cursor-pointer">
                    <TableCell className="font-mono">
                      <Link className="hover:underline" href={`/dashboard/inventory/bom/${row.id}`}>
                        {row.bom_code}
                      </Link>
                    </TableCell>
                    <TableCell>{formatStatus(row)}</TableCell>
                    <TableCell>
                      {row.item ? (
                        <Link className="hover:underline" href={`/dashboard/inventory/bom/${row.id}`}>
                          {row.item.sku} - {row.item.name}
                        </Link>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right">₹{Number(row.total_cost ?? 0).toFixed(2)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
