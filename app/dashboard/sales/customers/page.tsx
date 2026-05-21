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
import { ArrowLeft, ArrowUpDown, EllipsisVertical, Filter, Plus, Search } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'

type CustomerTypeFilter = 'all' | 'oem' | 'oe' | 'distributor' | 'export' | 'ecommerce' | 'retail'

const TYPE_FILTER_LABEL: Record<CustomerTypeFilter, string> = {
  all: 'All types',
  oem: 'OEM',
  oe: 'OE',
  distributor: 'Distributor',
  export: 'Export',
  ecommerce: 'Ecommerce',
  retail: 'Retail',
}

type CustomerSortOption =
  | 'name_asc'
  | 'name_desc'
  | 'type_asc'
  | 'type_desc'
  | 'gst_asc'
  | 'gst_desc'
  | 'created_desc'
  | 'created_asc'

const SORT_LABELS: Record<CustomerSortOption, string> = {
  name_asc: 'Name (A–Z)',
  name_desc: 'Name (Z–A)',
  type_asc: 'Type (A–Z)',
  type_desc: 'Type (Z–A)',
  gst_asc: 'GST (A–Z)',
  gst_desc: 'GST (Z–A)',
  created_desc: 'Newest first',
  created_asc: 'Oldest first',
}

type CustomerRow = {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  gst_number?: string | null
  customer_type?: string | null
  contact_person?: string | null
  payment_terms?: string | null
  created_at?: string | null
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

export default function CustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<CustomerTypeFilter>('all')
  const [sortBy, setSortBy] = useState<CustomerSortOption>('name_asc')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void loadCustomers()
  }, [])

  const loadCustomers = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await erpFetch<{ data: CustomerRow[] }>('/api/customers?limit=500')
      setCustomers(response.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load customers')
    } finally {
      setLoading(false)
    }
  }

  const filteredCustomers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    let rows = customers.filter((customer) => {
      if (typeFilter !== 'all' && customer.customer_type !== typeFilter) return false
      if (!term) return true
      return (
        customer.name.toLowerCase().includes(term) ||
        (customer.gst_number ?? '').toLowerCase().includes(term) ||
        (customer.email ?? '').toLowerCase().includes(term) ||
        (customer.phone ?? '').toLowerCase().includes(term) ||
        (customer.contact_person ?? '').toLowerCase().includes(term) ||
        (customer.payment_terms ?? '').toLowerCase().includes(term) ||
        (TYPE_FILTER_LABEL[customer.customer_type as CustomerTypeFilter] ?? '')
          .toLowerCase()
          .includes(term)
      )
    })

    const dir = sortBy.endsWith('_desc') ? 'desc' : 'asc'
    const key = sortBy.replace(/_asc$|_desc$/, '')

    rows = [...rows].sort((a, b) => {
      switch (key) {
        case 'name':
          return cmpStr(a.name, b.name, dir)
        case 'type':
          return cmpStr(a.customer_type ?? '', b.customer_type ?? '', dir)
        case 'gst':
          return cmpStr(a.gst_number ?? '', b.gst_number ?? '', dir)
        case 'created':
          return cmpTime(a.created_at ?? '', b.created_at ?? '', dir)
        default:
          return 0
      }
    })

    return rows
  }, [customers, searchTerm, sortBy, typeFilter])

  const filterActive = typeFilter !== 'all'

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="sm" asChild className="mt-1">
            <Link href="/dashboard/sales">
              <ArrowLeft size={18} />
            </Link>
          </Button>
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Customers</h1>
            <p className="mt-2 text-gray-600">All registered customers for sales operations</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="icon" aria-label="More customer actions">
                <EllipsisVertical className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/dashboard/import-export?segment=customers">Import/Export Data</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Link href="/dashboard/sales/customers/new">
            <Button className="flex items-center gap-2">
              <Plus size={18} />
              Add a Customer
            </Button>
          </Link>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Customer directory</CardTitle>
          <CardDescription>
            Search, filter, and sort all customers
            {!loading && (
              <span className="mt-1 block text-xs text-muted-foreground">
                Showing {filteredCustomers.length} of {customers.length} customers
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
                placeholder="Search by name, GST number, email, phone, contact…"
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
                    onValueChange={(v) => setTypeFilter(v as CustomerTypeFilter)}
                  >
                    {(Object.keys(TYPE_FILTER_LABEL) as CustomerTypeFilter[]).map((key) => (
                      <DropdownMenuRadioItem key={key} value={key}>
                        {TYPE_FILTER_LABEL[key]}
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
                    onValueChange={(v) => setSortBy(v as CustomerSortOption)}
                  >
                    {(Object.keys(SORT_LABELS) as CustomerSortOption[]).map((key) => (
                      <DropdownMenuRadioItem key={key} value={key}>
                        {SORT_LABELS[key]}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button type="button" variant="outline" onClick={() => void loadCustomers()}>
                Refresh
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-slate-900/60">
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>GST Number</TableHead>
                  <TableHead>Payment terms</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7}>Loading…</TableCell>
                  </TableRow>
                ) : filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>No customers found.</TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => (
                    <TableRow
                      key={customer.id}
                      className="cursor-pointer text-gray-800 hover:bg-gray-50 dark:text-slate-200 dark:hover:bg-slate-800/40"
                      onClick={() => router.push(`/dashboard/sales/customers/${customer.id}`)}
                    >
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell className="capitalize">
                        {customer.customer_type
                          ? TYPE_FILTER_LABEL[customer.customer_type as CustomerTypeFilter] ??
                            customer.customer_type
                          : '—'}
                      </TableCell>
                      <TableCell>{customer.contact_person ?? '—'}</TableCell>
                      <TableCell>{customer.phone ?? '—'}</TableCell>
                      <TableCell>{customer.email ?? '—'}</TableCell>
                      <TableCell>{customer.gst_number ?? '—'}</TableCell>
                      <TableCell>{customer.payment_terms ?? '—'}</TableCell>
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
