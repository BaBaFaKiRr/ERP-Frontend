'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { erpFetch } from '@/lib/erp-api'

type WorkOrderLine = {
  id: string
  item_id: string
  qty_ordered: number
  qty_produced: number
  qty_shipped?: number
  qty_ready_to_ship?: number
  items?: { sku: string; name: string } | null
}

type CreatedByUser = {
  email: string | null
  first_name: string | null
  last_name: string | null
} | null

type WorkOrderDetail = {
  id: string
  wo_number: string
  status: string
  created_at: string
  sales_order_id?: string
  sales_orders?: { id: string; order_number: string; customers?: { name: string } | null } | null
  sales_order_lines?: { id: string; items?: { sku: string; name: string } | null } | null
  work_order_lines?: WorkOrderLine[] | null
  created_by_user?: CreatedByUser
}

const statusLabel: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  paused: 'Paused',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export default function WorkOrderDetailsPage() {
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : ''
  const [workOrder, setWorkOrder] = useState<WorkOrderDetail | null>(null)
  const [inventoryByItem, setInventoryByItem] = useState<Record<string, number>>({})
  const [qtyInputs, setQtyInputs] = useState<Record<string, string>>({})
  const [readyInputs, setReadyInputs] = useState<Record<string, string>>({})
  const [bookingLineId, setBookingLineId] = useState<string | null>(null)
  const [readyLineId, setReadyLineId] = useState<string | null>(null)
  const [shipInputs, setShipInputs] = useState<Record<string, string>>({})
  const [shipLineId, setShipLineId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [me, setMe] = useState<{ role: string } | null>(null)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    void load()
  }, [id])

  useEffect(() => {
    void (async () => {
      try {
        const res = await erpFetch<{ user: { role: string } }>('/api/me')
        setMe(res.user ?? null)
      } catch {
        setMe(null)
      }
    })()
  }, [])

  const load = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [woRes, invRes] = await Promise.all([
        erpFetch<{ data: WorkOrderDetail }>(`/api/work-orders/${id}`),
        erpFetch<{ data: Array<{ item_id: string; qty_on_hand: number }> }>('/api/inventory/balances'),
      ])
      const wo = woRes.data ?? null
      setWorkOrder(wo)
      const byItem: Record<string, number> = {}
      for (const row of invRes.data ?? []) byItem[row.item_id] = Number(row.qty_on_hand ?? 0)
      setInventoryByItem(byItem)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load work order')
    } finally {
      setLoading(false)
    }
  }

  const canReadyToShip = ['admin', 'production', 'sales'].includes(me?.role ?? '')
  const canCancelWo = ['admin', 'production'].includes(me?.role ?? '')

  const bookInventory = async (line: WorkOrderLine) => {
    const value = Number(qtyInputs[line.id] ?? 0)
    if (!Number.isFinite(value) || value <= 0) {
      alert('Enter a valid quantity to book.')
      return
    }

    setBookingLineId(line.id)
    try {
      await erpFetch(`/api/work-orders/${id}/book-inventory`, {
        method: 'POST',
        body: JSON.stringify({
          line_id: line.id,
          quantity: value,
        }),
      })
      setQtyInputs((prev) => ({ ...prev, [line.id]: '' }))
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to book inventory')
    } finally {
      setBookingLineId(null)
    }
  }

  const addReadyToShip = async (line: WorkOrderLine) => {
    const value = Number(readyInputs[line.id] ?? 0)
    if (!Number.isFinite(value) || value <= 0) {
      alert('Enter a valid quantity.')
      return
    }
    setReadyLineId(line.id)
    try {
      await erpFetch(`/api/work-orders/${id}/ready-to-ship`, {
        method: 'POST',
        body: JSON.stringify({ line_id: line.id, quantity: value }),
      })
      setReadyInputs((prev) => ({ ...prev, [line.id]: '' }))
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update ready-to-ship')
    } finally {
      setReadyLineId(null)
    }
  }

  const shipFromBooked = async (line: WorkOrderLine) => {
    const value = Number(shipInputs[line.id] ?? 0)
    if (!Number.isFinite(value) || value <= 0) {
      alert('Enter a valid quantity to ship.')
      return
    }
    setShipLineId(line.id)
    try {
      await erpFetch(`/api/work-orders/${id}/ship`, {
        method: 'POST',
        body: JSON.stringify({ line_id: line.id, quantity: value }),
      })
      setShipInputs((prev) => ({ ...prev, [line.id]: '' }))
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to ship')
    } finally {
      setShipLineId(null)
    }
  }

  const cancelWorkOrder = async () => {
    if (!confirm('Cancel this work order and release material reservations?')) return
    setCancelling(true)
    try {
      await erpFetch(`/api/work-orders/${id}/cancel`, { method: 'POST', body: JSON.stringify({}) })
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Cancel failed')
    } finally {
      setCancelling(false)
    }
  }

  if (loading && !workOrder) return <div className="p-8 text-muted-foreground">Loading work order…</div>

  if (error || !workOrder) {
    return (
      <div className="p-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard/manufacturing">
            <ArrowLeft className="mr-2 size-4" />
            Back to manufacturing
          </Link>
        </Button>
        <p className="text-red-600">{error ?? 'Work order not found'}</p>
      </div>
    )
  }

  const lines = workOrder.work_order_lines ?? []
  const primary = lines[0]
  const so = workOrder.sales_orders
  const soLine = workOrder.sales_order_lines
  const creator = workOrder.created_by_user
  const creatorName = creator
    ? [creator.first_name, creator.last_name].filter(Boolean).join(' ').trim() || creator.email || '—'
    : '—'

  const A = primary ? Number(primary.qty_ordered ?? 0) : 0
  const B = primary ? Number(primary.qty_shipped ?? 0) : 0
  const C = primary ? Number(primary.qty_ready_to_ship ?? 0) : 0
  const balance = Math.max(0, A - B - C)

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/manufacturing" aria-label="Back">
              <ArrowLeft size={20} />
            </Link>
          </Button>
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white font-mono">{workOrder.wo_number}</h1>
            <p className="text-gray-600 mt-1">Work order details</p>
          </div>
        </div>
        {canCancelWo && workOrder.status !== 'completed' && workOrder.status !== 'cancelled' && (
          <Button type="button" variant="outline" disabled={cancelling} onClick={() => void cancelWorkOrder()}>
            {cancelling ? 'Cancelling…' : 'Cancel work order'}
          </Button>
        )}
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Header</CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Sales order no.</p>
              {so?.id ? (
                <Link href={`/dashboard/sales/${so.id}`} className="font-mono font-semibold text-blue-600 hover:underline">
                  {so.order_number}
                </Link>
              ) : (
                <p className="font-mono font-semibold">{so?.order_number ?? '—'}</p>
              )}
            </div>
            <div>
              <p className="text-muted-foreground">Customer</p>
              <p className="font-medium">{so?.customers?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Created on</p>
              <p className="font-medium">
                {workOrder.created_at ? new Date(workOrder.created_at).toLocaleString('en-GB') : '—'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Created by</p>
              <p className="font-medium">{creatorName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <p className="font-medium">{statusLabel[workOrder.status] ?? workOrder.status}</p>
            </div>
          </CardContent>
        </Card>

        {primary && (
          <Card>
            <CardHeader>
              <CardTitle>Output item (sales line)</CardTitle>
              <CardDescription>
                Underlying item: {soLine?.items?.sku ?? primary.items?.sku ?? '—'} —{' '}
                {soLine?.items?.name ?? primary.items?.name ?? '—'}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total order qty (A)</p>
                <p className="text-2xl font-semibold">{A}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Qty shipped (B)</p>
                <p className="text-2xl font-semibold">{B}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Qty ready to ship (C)</p>
                <p className="text-2xl font-semibold">{C}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Balance (A − B − C)</p>
                <p className="text-2xl font-semibold">{balance}</p>
              </div>
              {canReadyToShip && workOrder.status !== 'completed' && workOrder.status !== 'cancelled' && (
                <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap items-end gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">Add to ready to ship</span>
                    <Input
                      type="number"
                      min={0}
                      className="w-32"
                      value={readyInputs[primary.id] ?? ''}
                      onChange={(e) =>
                        setReadyInputs((prev) => ({ ...prev, [primary.id]: e.target.value }))
                      }
                      placeholder="Qty"
                    />
                  </div>
                  <Button
                    type="button"
                    disabled={readyLineId === primary.id}
                    onClick={() => void addReadyToShip(primary)}
                  >
                    {readyLineId === primary.id ? 'Saving…' : 'Add to ready to ship'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Line booking, ship from booked</CardTitle>
            <CardDescription>
              Book moves on-hand FG into this WO line; ship posts shipped qty from booked quantity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>SKU</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty ordered</TableHead>
                    <TableHead className="text-right">Booked</TableHead>
                    <TableHead className="text-right">On hand</TableHead>
                    <TableHead className="min-w-[100px]">Qty to book</TableHead>
                    <TableHead>Book</TableHead>
                    <TableHead className="text-right">Shipped</TableHead>
                    <TableHead className="text-right">Ready</TableHead>
                    <TableHead className="min-w-[100px]">Qty to ship</TableHead>
                    <TableHead>Ship</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11}>No lines.</TableCell>
                    </TableRow>
                  ) : (
                    lines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell className="font-mono">{line.items?.sku ?? '—'}</TableCell>
                        <TableCell>{line.items?.name ?? '—'}</TableCell>
                        <TableCell className="text-right">{Number(line.qty_ordered ?? 0)}</TableCell>
                        <TableCell className="text-right">{Number(line.qty_produced ?? 0)}</TableCell>
                        <TableCell className="text-right">{Number(inventoryByItem[line.item_id] ?? 0)}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            value={qtyInputs[line.id] ?? ''}
                            onChange={(e) =>
                              setQtyInputs((prev) => ({ ...prev, [line.id]: e.target.value }))
                            }
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            size="sm"
                            disabled={bookingLineId === line.id}
                            onClick={() => void bookInventory(line)}
                          >
                            {bookingLineId === line.id ? '…' : 'Book'}
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">{Number(line.qty_shipped ?? 0)}</TableCell>
                        <TableCell className="text-right">{Number(line.qty_ready_to_ship ?? 0)}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            value={shipInputs[line.id] ?? ''}
                            onChange={(e) =>
                              setShipInputs((prev) => ({ ...prev, [line.id]: e.target.value }))
                            }
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            size="sm"
                            disabled={shipLineId === line.id}
                            onClick={() => void shipFromBooked(line)}
                          >
                            {shipLineId === line.id ? '…' : 'Ship'}
                          </Button>
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
    </div>
  )
}
