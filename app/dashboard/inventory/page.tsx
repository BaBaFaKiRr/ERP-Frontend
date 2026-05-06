'use client'

import { useEffect, useState } from 'react'
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
  qty_on_hand: number
  items?: { sku: string; name: string; reorder_level: number } | null
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

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [balances, setBalances] = useState<BalanceRow[]>([])
  const [shortages, setShortages] = useState<ShortageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void load()
  }, [])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [b, s] = await Promise.all([
        erpFetch<{ data: BalanceRow[] }>('/api/inventory/balances'),
        erpFetch<{ data: ShortageRow[] }>('/api/shortages'),
      ])
      setBalances(b.data ?? [])
      setShortages(s.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  const filtered = balances.filter(
    (r) =>
      (r.items?.sku ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.items?.name ?? '').toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const hasShortage = !loading && shortages.some((s) => Number(s.shortage) > 0)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Stock</h1>
        <p className="text-gray-600 mt-2">
          {hasShortage
            ? 'On-hand balances and BOM-based shortages for open work orders (single warehouse).'
            : 'On-hand balances for the warehouse (immutable ledger). Shortages appear here only when open work orders drive a material gap.'}
        </p>
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
          <CardDescription>Immutable ledger drives these figures (standard cost in master).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <Input
                placeholder="Search SKU or name…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="button" variant="outline" onClick={() => void load()}>
              Refresh
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Qty on hand</TableHead>
                  <TableHead className="text-right">Reorder warning</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4}>Loading…</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r) => (
                    <TableRow key={r.item_id}>
                      <TableCell className="font-mono">{r.items?.sku}</TableCell>
                      <TableCell>{r.items?.name}</TableCell>
                      <TableCell className="text-right">{r.qty_on_hand}</TableCell>
                      <TableCell className="text-right">{r.items?.reorder_level ?? '—'}</TableCell>
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
