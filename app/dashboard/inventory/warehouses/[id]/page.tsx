'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type BalanceRow = {
  item_id: string
  qty_on_hand: number
  items?: { sku: string; name: string } | null
}

type WarehouseDetail = {
  id: string
  name: string
  code: string | null
  is_default: boolean
  is_active: boolean
  address?: {
    line1?: string
    city?: string
    state?: string
    postal_code?: string
    country?: string
  } | null
  notes?: string | null
  balances?: BalanceRow[]
}

export default function WarehouseDetailPage() {
  const params = useParams()
  const id = String(params.id ?? '')
  const [warehouse, setWarehouse] = useState<WarehouseDetail | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    void load()
  }, [id])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await erpFetch<{ data: WarehouseDetail }>(`/api/warehouses/${id}`)
      setWarehouse(res.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load warehouse')
    } finally {
      setLoading(false)
    }
  }

  const balances = warehouse?.balances ?? []
  const filtered = balances.filter((row) => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return true
    return (
      (row.items?.sku ?? '').toLowerCase().includes(term) ||
      (row.items?.name ?? '').toLowerCase().includes(term)
    )
  })

  const address = warehouse?.address
  const addressLine = [
    address?.line1,
    address?.city,
    address?.state,
    address?.postal_code,
    address?.country,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-start gap-3">
        <Link href="/dashboard/inventory/warehouses">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft size={16} />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            {warehouse?.name ?? 'Warehouse'}
            {warehouse?.is_default ? <Badge variant="secondary">Default</Badge> : null}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {warehouse?.code ? `Code: ${warehouse.code}` : 'Per-warehouse stock balances'}
          </p>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {warehouse ? (
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Address:</span> {addressLine || '—'}
            </p>
            {warehouse.notes ? (
              <p>
                <span className="text-muted-foreground">Notes:</span> {warehouse.notes}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Stock at this warehouse</CardTitle>
          <CardDescription>Items with on-hand quantity greater than zero.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Search SKU or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No stock at this warehouse.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Qty on hand</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.item_id}>
                    <TableCell className="font-mono">{row.items?.sku}</TableCell>
                    <TableCell>{row.items?.name}</TableCell>
                    <TableCell className="text-right">{row.qty_on_hand}</TableCell>
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
