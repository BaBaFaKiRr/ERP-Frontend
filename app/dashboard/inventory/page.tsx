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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Search, AlertCircle } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'

type BalanceRow = {
  item_id: string
  warehouse_id: string
  qty_on_hand: number
  items?: { sku: string; name: string; reorder_level: number } | null
  warehouse?: { id: string; name: string } | null
}

type ShortageRow = {
  item_id: string
  sku: string
  name: string
  on_hand: number
  reserve_quantity: number
  required_for_open_wo: number
  shortage: number
  suggested_order_qty: number
}

type WarehouseColumn = {
  id: string
  name: string
  is_default?: boolean
}

type PivotedRow = {
  item_id: string
  sku: string
  name: string
  qtyByWarehouse: Record<string, number>
}

function formatQty(value: number): string {
  if (Math.abs(value) < 1e-9) return '—'
  return String(value)
}

function totalStockForRow(row: PivotedRow, warehouseIds: string[]): number {
  return warehouseIds.reduce((sum, id) => sum + (row.qtyByWarehouse[id] ?? 0), 0)
}

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [balances, setBalances] = useState<BalanceRow[]>([])
  const [shortages, setShortages] = useState<ShortageRow[]>([])
  const [warehouses, setWarehouses] = useState<WarehouseColumn[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void loadBalances()
  }, [])

  const loadBalances = async () => {
    setLoading(true)
    setError(null)
    try {
      const [whRes, b, s] = await Promise.all([
        erpFetch<{ data: WarehouseColumn[] }>('/api/warehouses'),
        erpFetch<{ data: BalanceRow[] }>('/api/inventory/balances?per_warehouse=true'),
        erpFetch<{ data: ShortageRow[] }>('/api/shortages'),
      ])
      const whList = (whRes.data ?? []).sort((a, b) => {
        if (a.is_default && !b.is_default) return -1
        if (!a.is_default && b.is_default) return 1
        return a.name.localeCompare(b.name)
      })
      setWarehouses(whList)
      setBalances(b.data ?? [])
      setShortages(s.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  const pivotRows = useMemo(() => {
    const byItem = new Map<string, PivotedRow>()

    for (const row of balances) {
      let entry = byItem.get(row.item_id)
      if (!entry) {
        entry = {
          item_id: row.item_id,
          sku: row.items?.sku ?? '',
          name: row.items?.name ?? '',
          qtyByWarehouse: {},
        }
        byItem.set(row.item_id, entry)
      }
      entry.qtyByWarehouse[row.warehouse_id] = Number(row.qty_on_hand ?? 0)
    }

    return Array.from(byItem.values()).filter((row) =>
      Object.values(row.qtyByWarehouse).some((qty) => qty > 0),
    )
  }, [balances])

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return pivotRows
    return pivotRows.filter(
      (r) => r.sku.toLowerCase().includes(term) || r.name.toLowerCase().includes(term),
    )
  }, [pivotRows, searchTerm])

  const hasShortage = !loading && shortages.some((s) => Number(s.shortage) > 0)
  const colSpan = 3 + warehouses.length

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Stock</h1>
          <p className="text-gray-600 mt-2">
            {hasShortage
              ? 'On-hand balances across warehouses and BOM-based shortages for open work orders.'
              : 'Per-warehouse on-hand balances from the immutable stock ledger.'}
          </p>
        </div>
        <Link href="/dashboard/inventory/warehouses">
          <Button variant="outline">Manage warehouses</Button>
        </Link>
      </div>

      {error && (
        <p className="text-sm text-red-600 mb-4">
          {error}. Set NEXT_PUBLIC_ERP_API_URL and run ERP-Backend.
        </p>
      )}

      {hasShortage ? (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle size={22} />
              Shortages (materials)
            </CardTitle>
            <CardDescription>
              Required − on-hand; suggested order = shortage + item reserve quantity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">On hand</TableHead>
                    <TableHead className="text-right">Required (WO)</TableHead>
                    <TableHead className="text-right">Shortage</TableHead>
                    <TableHead className="text-right">Suggested buy</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shortages
                    .filter((s) => Number(s.shortage) > 0)
                    .map((s) => (
                      <TableRow key={s.item_id}>
                        <TableCell className="font-mono">{s.sku}</TableCell>
                        <TableCell>{s.name}</TableCell>
                        <TableCell className="text-right">{s.on_hand}</TableCell>
                        <TableCell className="text-right">{s.required_for_open_wo}</TableCell>
                        <TableCell className="text-right font-medium text-amber-700">
                          {s.shortage}
                        </TableCell>
                        <TableCell className="text-right">{s.suggested_order_qty}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Stock balances</CardTitle>
          <CardDescription>One row per item; each warehouse column shows on-hand quantity there.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <Input
                placeholder="Search SKU or name…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="button" variant="outline" onClick={() => void loadBalances()}>
              Refresh
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10">SKU</TableHead>
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[160px]">Name</TableHead>
                  {warehouses.map((wh) => (
                    <TableHead key={wh.id} className="text-right whitespace-nowrap">
                      {wh.name}
                    </TableHead>
                  ))}
                  <TableHead className="text-right whitespace-nowrap font-semibold">Total Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={colSpan}>Loading…</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={colSpan} className="text-muted-foreground">
                      No stock balances found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row) => (
                    <TableRow key={row.item_id}>
                      <TableCell className="font-mono sticky left-0 bg-background">{row.sku}</TableCell>
                      <TableCell className="sticky left-0 bg-background">{row.name}</TableCell>
                      {warehouses.map((wh) => (
                        <TableCell key={wh.id} className="text-right tabular-nums">
                          {formatQty(row.qtyByWarehouse[wh.id] ?? 0)}
                        </TableCell>
                      ))}
                      <TableCell className="text-right tabular-nums font-medium">
                        {formatQty(totalStockForRow(row, warehouses.map((w) => w.id)))}
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
