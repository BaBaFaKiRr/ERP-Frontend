'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationEllipsis,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { EllipsisVertical, Filter, Plus, Search } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'

const PAGE_SIZE = 15

type SupplierTypeFilter = 'all' | 'domestic' | 'international'

const TYPE_FILTER_LABEL: Record<SupplierTypeFilter, string> = {
  all: 'All types',
  domestic: 'Domestic',
  international: 'International',
}

type SupplierRow = {
  id: string
  supplier_code?: string | null
  name: string
  email?: string | null
  phone?: string | null
  gst_number?: string | null
  supplier_type?: 'domestic' | 'international' | null
  supplier_country?: string | null
  supplier_items?: Array<{
    item_id: string
    items?: {
      id: string
      sku?: string | null
      name?: string | null
    } | null
  }> | null
}

export default function SuppliersPage() {
  const router = useRouter()
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<SupplierTypeFilter>('all')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void Promise.all([loadSuppliers(), loadMe()])
  }, [])

  const loadSuppliers = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await erpFetch<{ data: SupplierRow[] }>('/api/suppliers')
      setSuppliers(response.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load suppliers')
    } finally {
      setLoading(false)
    }
  }

  const loadMe = async () => {
    try {
      const res = await erpFetch<{ user: { role: string } }>('/api/me')
      setIsAdmin(res.user.role === 'admin')
    } catch {
      setIsAdmin(false)
    }
  }

  const filteredSuppliers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    return suppliers
      .filter((supplier) => {
        if (typeFilter !== 'all' && supplier.supplier_type !== typeFilter) return false

        if (!term) return true

        const itemSearchHaystack = (supplier.supplier_items ?? [])
          .map((row) => `${row.items?.sku ?? ''} ${row.items?.name ?? ''}`.trim().toLowerCase())
          .join(' ')

        return (
          supplier.name.toLowerCase().includes(term) ||
          (supplier.supplier_code ?? '').toLowerCase().includes(term) ||
          (supplier.gst_number ?? '').toLowerCase().includes(term) ||
          itemSearchHaystack.includes(term)
        )
      })
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
  }, [searchTerm, suppliers, typeFilter])

  const totalPages = Math.max(1, Math.ceil(filteredSuppliers.length / PAGE_SIZE))

  const paginatedSuppliers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredSuppliers.slice(start, start + PAGE_SIZE)
  }, [filteredSuppliers, page])

  useEffect(() => {
    setPage(1)
  }, [searchTerm, typeFilter])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const filterActive = typeFilter !== 'all'
  const rangeStart = filteredSuppliers.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(page * PAGE_SIZE, filteredSuppliers.length)

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    const pages = new Set<number>([1, totalPages, page, page - 1, page + 1])
    return [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b)
  }, [page, totalPages])

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Suppliers</h1>
          <p className="mt-2 text-gray-600">All registered suppliers for purchase operations</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="icon" aria-label="More supplier actions">
                  <EllipsisVertical className="size-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/import-export?segment=suppliers">Import/Export Data</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link href="/dashboard/purchase/suppliers/new">
              <Button className="flex items-center gap-2">
                <Plus size={18} />
                Add Supplier
              </Button>
            </Link>
          </div>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Supplier Directory</CardTitle>
          <CardDescription>
            Search and view all suppliers
            {!loading && (
              <span className="mt-1 block text-xs text-muted-foreground">
                {filteredSuppliers.length === 0
                  ? `Showing 0 of ${suppliers.length} suppliers`
                  : `Showing ${rangeStart}–${rangeEnd} of ${filteredSuppliers.length} suppliers${filteredSuppliers.length !== suppliers.length ? ` (${suppliers.length} total)` : ''}`}
                {searchTerm.trim() ? ` · matching “${searchTerm.trim()}”` : ''}
                {filterActive ? ` · ${TYPE_FILTER_LABEL[typeFilter]}` : ''}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <Input
                placeholder="Search by entity name, GST number, supplier code or item..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
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
                  <DropdownMenuLabel>Filter by type</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup
                    value={typeFilter}
                    onValueChange={(v) => setTypeFilter(v as SupplierTypeFilter)}
                  >
                    <DropdownMenuRadioItem value="all">{TYPE_FILTER_LABEL.all}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="domestic">{TYPE_FILTER_LABEL.domestic}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="international">
                      {TYPE_FILTER_LABEL.international}
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button type="button" variant="outline" onClick={() => void loadSuppliers()}>
                Refresh
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-slate-900/60">
                  <TableHead className="text-gray-700 dark:text-slate-200">Supplier Code</TableHead>
                  <TableHead className="text-gray-700 dark:text-slate-200">Name</TableHead>
                  <TableHead className="text-gray-700 dark:text-slate-200">Email</TableHead>
                  <TableHead className="text-gray-700 dark:text-slate-200">Phone</TableHead>
                  <TableHead className="text-gray-700 dark:text-slate-200">GST Number</TableHead>
                  <TableHead className="text-gray-700 dark:text-slate-200">Type</TableHead>
                  <TableHead className="text-gray-700 dark:text-slate-200">Country</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7}>Loading...</TableCell>
                  </TableRow>
                ) : filteredSuppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>No suppliers found.</TableCell>
                  </TableRow>
                ) : (
                  paginatedSuppliers.map((supplier) => (
                    <TableRow
                      key={supplier.id}
                      className="cursor-pointer text-gray-800 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800/40"
                      onClick={() => router.push(`/dashboard/purchase/suppliers/${supplier.id}`)}
                    >
                      <TableCell className="font-mono text-gray-800 dark:text-slate-200">
                        {supplier.supplier_code ?? '-'}
                      </TableCell>
                      <TableCell className="font-medium text-gray-800 dark:text-slate-200">
                        {supplier.name}
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-slate-200">{supplier.email ?? '-'}</TableCell>
                      <TableCell className="text-gray-800 dark:text-slate-200">{supplier.phone ?? '-'}</TableCell>
                      <TableCell className="text-gray-800 dark:text-slate-200">{supplier.gst_number ?? '-'}</TableCell>
                      <TableCell className="capitalize text-gray-800 dark:text-slate-200">
                        {supplier.supplier_type ?? '-'}
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-slate-200">
                        {supplier.supplier_country ?? '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {!loading && filteredSuppliers.length > 0 ? (
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <Pagination className="mx-0 w-auto justify-end">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        setPage((p) => Math.max(1, p - 1))
                      }}
                      className={page <= 1 ? 'pointer-events-none opacity-50' : undefined}
                    />
                  </PaginationItem>
                  {pageNumbers.map((pageNum, index) => {
                    const prev = pageNumbers[index - 1]
                    const showEllipsisBefore = prev != null && pageNum - prev > 1
                    return (
                      <span key={pageNum} className="contents">
                        {showEllipsisBefore ? (
                          <PaginationItem>
                            <PaginationEllipsis />
                          </PaginationItem>
                        ) : null}
                        <PaginationItem>
                          <PaginationLink
                            href="#"
                            isActive={pageNum === page}
                            onClick={(e) => {
                              e.preventDefault()
                              setPage(pageNum)
                            }}
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      </span>
                    )
                  })}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        setPage((p) => Math.min(totalPages, p + 1))
                      }}
                      className={page >= totalPages ? 'pointer-events-none opacity-50' : undefined}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
