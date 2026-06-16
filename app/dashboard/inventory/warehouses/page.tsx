'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Search } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type WarehouseRow = {
  id: string
  name: string
  code: string | null
  is_default: boolean
  address?: { city?: string; state?: string } | null
  item_count?: number
  total_qty?: number
  created_at?: string | null
  created_by_user?: { first_name?: string | null; last_name?: string | null; email?: string | null } | null
}

type MeUser = {
  role?: string | null
}

function createdByLabel(row: WarehouseRow): string {
  const user = row.created_by_user
  if (!user) return '—'
  const name = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()
  return name || user.email || '—'
}

function locationLabel(row: WarehouseRow): string {
  const city = row.address?.city?.trim()
  const state = row.address?.state?.trim()
  if (city && state) return `${city}, ${state}`
  return city || state || '—'
}

export default function WarehousesPage() {
  const router = useRouter()
  const [rows, setRows] = useState<WarehouseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    void load()
  }, [])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [warehousesRes, meRes] = await Promise.all([
        erpFetch<{ data: WarehouseRow[] }>('/api/warehouses'),
        erpFetch<{ user: MeUser }>('/api/me'),
      ])
      setRows(warehousesRes.data ?? [])
      setIsAdmin(meRes.user.role === 'admin')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load warehouses')
    } finally {
      setLoading(false)
    }
  }

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((row) => {
      const createdBy = createdByLabel(row).toLowerCase()
      return (
        row.name.toLowerCase().includes(term) ||
        (row.code ?? '').toLowerCase().includes(term) ||
        locationLabel(row).toLowerCase().includes(term) ||
        createdBy.includes(term)
      )
    })
  }, [rows, searchTerm])

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/dashboard/inventory">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft size={16} />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Warehouses</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Storage sites with per-warehouse stock and org-wide totals.
            </p>
          </div>
        </div>
        {isAdmin ? (
          <Link href="/dashboard/inventory/warehouses/new">
            <Button className="gap-2">
              <Plus size={16} />
              Add warehouse
            </Button>
          </Link>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>All warehouses</CardTitle>
          <CardDescription>Click a row to view stock at that location.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name, code, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading warehouses...</p>
          ) : filteredRows.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">No warehouses found.</p>
              {isAdmin ? (
                <Button asChild>
                  <Link href="/dashboard/inventory/warehouses/new">
                    <Plus className="size-4 mr-2" />
                    Add warehouse
                  </Link>
                </Button>
              ) : null}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Total qty</TableHead>
                  <TableHead>Created by</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/dashboard/inventory/warehouses/${row.id}`)}
                  >
                    <TableCell className="font-medium">
                      <span className="inline-flex items-center gap-2">
                        {row.name}
                        {row.is_default ? <Badge variant="secondary">Default</Badge> : null}
                      </span>
                    </TableCell>
                    <TableCell>{row.code || '—'}</TableCell>
                    <TableCell>{locationLabel(row)}</TableCell>
                    <TableCell className="text-right">{row.item_count ?? 0}</TableCell>
                    <TableCell className="text-right">{Number(row.total_qty ?? 0).toFixed(2)}</TableCell>
                    <TableCell>{createdByLabel(row)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
