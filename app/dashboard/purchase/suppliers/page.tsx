'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Search } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'

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
    if (!term) return suppliers

    return suppliers.filter((supplier) => {
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
  }, [searchTerm, suppliers])

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Suppliers</h1>
          <p className="mt-2 text-gray-600">All registered suppliers for purchase operations</p>
        </div>
        {isAdmin && (
          <Link href="/dashboard/purchase/suppliers/new">
            <Button className="flex items-center gap-2">
              <Plus size={18} />
              Add Supplier
            </Button>
          </Link>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Supplier Directory</CardTitle>
          <CardDescription>Search and view all suppliers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <Input
                placeholder="Search by entity name, GST number, supplier code or item..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="button" variant="outline" onClick={() => void loadSuppliers()}>
              Refresh
            </Button>
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
                  {isAdmin && <TableHead className="text-gray-700 dark:text-slate-200">Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 8 : 7}>Loading...</TableCell>
                  </TableRow>
                ) : filteredSuppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 8 : 7}>No suppliers found.</TableCell>
                  </TableRow>
                ) : (
                  filteredSuppliers.map((supplier) => (
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
                      {isAdmin && (
                        <TableCell>
                          <Link href={`/dashboard/purchase/suppliers/${supplier.id}/edit`}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                              }}
                            >
                              Edit
                            </Button>
                          </Link>
                        </TableCell>
                      )}
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
