'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ArrowLeft, ChevronDown, ChevronRight, FileText, Trash2 } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { cn } from '@/lib/utils'

type LineRow = {
  id: string
  item_id: string
  line_kind: string
  quantity: number
  unit_price: number | null
  line_total: number | null
  items?: { sku: string; name: string } | null
}

type SalesOrderDetail = {
  id: string
  order_number: string
  status: string
  order_date: string
  delivery_date?: string | null
  notes?: string | null
  total_amount?: number | null
  approved_at?: string | null
  rejected_at?: string | null
  deleted_at?: string | null
  customers?: { name: string; email?: string | null; phone?: string | null } | null
  sales_order_lines?: LineRow[] | null
  po_number?: string | null
  po_file_path?: string | null
  po_file_name?: string | null
}

type WoLine = { item_id: string; qty_ordered: number; qty_shipped?: number }
type WorkOrderRow = {
  id: string
  wo_number: string
  status: string
  sales_order_line_id?: string | null
  work_order_lines?: WoLine[] | null
}

type InventoryBalance = {
  item_id: string
  qty_on_hand: number
}

type DispatchSalesInvoice = {
  id: string
  invoice_number: string
  dispatch_order_id: string
  dispatch_orders?: { do_number?: string | null } | null
  status: 'active' | 'cancelled'
  created_at: string
}

type SentDispatchOrder = {
  id: string
  sales_order_id: string
  status: string
  dispatch_order_lines?: Array<{
    sales_order_line_id?: string | null
    qty_to_dispatch?: number | null
  }> | null
}

const statusLabel: Record<string, string> = {
  draft: 'Draft',
  pending_approval: 'Pending approval',
  approved: 'Approved',
  pending_work_order: 'Pending work order',
  work_order_open: 'Manufacturing...',
  in_progress: 'In progress',
  partially_shipped: 'Partially shipped',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
  deleted: 'Deleted',
}

const workOrderStatusLabel: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  paused: 'Paused',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

function invoiceFamilyKey(invoiceNumber: string): string {
  const m = invoiceNumber.match(/^(.*)-\d{3}$/)
  return m?.[1] ?? invoiceNumber
}

export default function SalesOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params.id === 'string' ? params.id : ''

  const [order, setOrder] = useState<SalesOrderDetail | null>(null)
  const [me, setMe] = useState<{ role: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [approving, setApproving] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [workOrders, setWorkOrders] = useState<WorkOrderRow[]>([])
  const [inventoryMap, setInventoryMap] = useState<Record<string, number>>({})
  const [salesInvoices, setSalesInvoices] = useState<DispatchSalesInvoice[]>([])
  const [dispatchShippedBySoLine, setDispatchShippedBySoLine] = useState<Record<string, number>>({})
  const [expandedInvoiceFamilies, setExpandedInvoiceFamilies] = useState<Record<string, boolean>>({})

  const openPoPreview = async () => {
    if (!order?.id || !order.po_number) return
    try {
      const res = await erpFetch<{ data: { signed_url: string } }>(`/api/sales-orders/${order.id}/purchase-order-url`)
      if (res.data?.signed_url) window.open(res.data.signed_url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to open purchase order')
    }
  }

  const loadOrder = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const res = await erpFetch<{ data: SalesOrderDetail }>(`/api/sales-orders/${id}`)
      setOrder(res.data ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load order')
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  const loadAux = useCallback(async () => {
    if (!id) return
    try {
      const [woRes, invRes, siRes, dispatchRes] = await Promise.all([
        erpFetch<{ data: WorkOrderRow[] }>(`/api/work-orders?sales_order_id=${id}`),
        erpFetch<{ data: InventoryBalance[] }>('/api/inventory/balances'),
        erpFetch<{ data: DispatchSalesInvoice[] }>(`/api/dispatch-sales-invoices?sales_order_id=${id}`),
        erpFetch<{ data: SentDispatchOrder[] }>('/api/dispatch/orders'),
      ])
      setWorkOrders(woRes.data ?? [])
      const m: Record<string, number> = {}
      for (const b of invRes.data ?? []) m[b.item_id] = Number(b.qty_on_hand ?? 0)
      setInventoryMap(m)
      setSalesInvoices(siRes.data ?? [])
      const shippedMap: Record<string, number> = {}
      for (const d of dispatchRes.data ?? []) {
        if (d.sales_order_id !== id) continue
        if (!['sent', 'dispatched'].includes(String(d.status))) continue
        for (const line of d.dispatch_order_lines ?? []) {
          const soLineId = String(line.sales_order_line_id ?? '')
          if (!soLineId) continue
          shippedMap[soLineId] = (shippedMap[soLineId] ?? 0) + Number(line.qty_to_dispatch ?? 0)
        }
      }
      setDispatchShippedBySoLine(shippedMap)
    } catch {
      setWorkOrders([])
      setInventoryMap({})
      setSalesInvoices([])
      setDispatchShippedBySoLine({})
    }
  }, [id])

  useEffect(() => {
    void loadOrder()
  }, [loadOrder])

  useEffect(() => {
    void loadAux()
  }, [loadAux])

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

  const isAdmin = me?.role === 'admin'

  const handleApprove = async () => {
    if (!id || !order) return
    setApproving(true)
    try {
      await erpFetch(`/api/sales-orders/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({}),
      })
      await loadOrder()
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Approval failed')
    } finally {
      setApproving(false)
    }
  }

  const handleReject = async () => {
    if (!id) return
    setActionBusy(true)
    try {
      await erpFetch(`/api/sales-orders/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({}),
      })
      setRejectOpen(false)
      await loadOrder()
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Reject failed')
    } finally {
      setActionBusy(false)
    }
  }

  const handleSoftDelete = async () => {
    if (!id) return
    setActionBusy(true)
    try {
      await erpFetch(`/api/sales-orders/${id}/delete`, {
        method: 'POST',
        body: JSON.stringify({}),
      })
      setDeleteOpen(false)
      await loadOrder()
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setActionBusy(false)
    }
  }

  if (loading && !order) {
    return (
      <div className="p-8 text-muted-foreground">Loading order…</div>
    )
  }

  if (error || !order) {
    return (
      <div className="p-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard/sales/orders">
            <ArrowLeft className="mr-2 size-4" />
            Back to sales orders
          </Link>
        </Button>
        <p className="text-red-600">{error ?? 'Order not found'}</p>
      </div>
    )
  }

  const lines = order.sales_order_lines ?? []
  const stockLines = lines.filter((l) => l.line_kind === 'stock')
  const totalQtyOrdered = stockLines.reduce((sum, l) => sum + Number(l.quantity ?? 0), 0)
  const subTotal = lines.reduce((sum, l) => sum + Number(l.line_total ?? 0), 0)
  const gstAmount = Math.round(subTotal * 0.18 * 100) / 100
  const grandTotal = Math.round((subTotal + gstAmount) * 100) / 100

  const qtyShippedForSoLine = (lineId: string, itemId: string) => {
    const dispatchQty = Number(dispatchShippedBySoLine[lineId] ?? 0)
    if (dispatchQty > 0) return dispatchQty
    let s = 0
    for (const wo of workOrders) {
      if (wo.sales_order_line_id !== lineId) continue
      for (const wl of wo.work_order_lines ?? []) {
        if (wl.item_id === itemId) s += Number(wl.qty_shipped ?? 0)
      }
    }
    return s
  }

  const salesInvoiceGroups = (() => {
    const families = new Map<string, DispatchSalesInvoice[]>()
    for (const row of salesInvoices) {
      const key = invoiceFamilyKey(row.invoice_number)
      const existing = families.get(key) ?? []
      existing.push(row)
      families.set(key, existing)
    }
    const groups = Array.from(families.entries()).map(([key, rows]) => ({
      key,
      rows: rows
        .slice()
        .sort((a, b) => a.invoice_number.localeCompare(b.invoice_number, undefined, { numeric: true })),
      latestCreatedAt: rows
        .slice()
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at,
    }))
    return groups.sort(
      (a, b) =>
        new Date(b.latestCreatedAt ?? 0).getTime() - new Date(a.latestCreatedAt ?? 0).getTime(),
    )
  })()

  return (
    <div className={cn('p-8 max-w-4xl', order.status === 'deleted' && 'opacity-80')}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/sales/orders" aria-label="Back">
              <ArrowLeft size={20} />
            </Link>
          </Button>
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white font-mono">{order.order_number}</h1>
            <p className="text-gray-600 mt-2">Sales order details</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Button variant="outline" asChild className="gap-2">
            <Link href={`/dashboard/sales/${id}/proforma`}>
              <FileText className="size-4" />
              Proforma invoice
            </Link>
          </Button>
        {isAdmin && order.status === 'pending_approval' && (
          <>
            <Button onClick={() => void handleApprove()} disabled={approving || actionBusy}>
              {approving ? 'Approving…' : 'Approve order'}
            </Button>
            <Button
              variant="outline"
              className="text-destructive border-destructive/50"
              disabled={approving || actionBusy}
              onClick={() => setRejectOpen(true)}
            >
              Reject
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:bg-destructive/10"
              title="Soft delete"
              disabled={approving || actionBusy}
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="size-5" />
            </Button>
          </>
        )}
        {isAdmin && order.status !== 'pending_approval' && order.status !== 'deleted' && (
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:bg-destructive/10"
            title="Soft delete"
            disabled={actionBusy}
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-5" />
          </Button>
        )}
      </div>
      </div>

      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject this order?</AlertDialogTitle>
            <AlertDialogDescription>
              It will be marked <strong>Rejected</strong> and stay visible in the sales order list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="destructive" disabled={actionBusy} onClick={() => void handleReject()}>
              {actionBusy ? 'Working…' : 'Reject order'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this order?</AlertDialogTitle>
            <AlertDialogDescription>
              Soft delete: the order remains with status <strong>Deleted</strong> for audit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="destructive" disabled={actionBusy} onClick={() => void handleSoftDelete()}>
              {actionBusy ? 'Working…' : 'Delete'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Customer</p>
              <p className="font-medium">{order.customers?.name ?? '—'}</p>
              {(order.customers?.email || order.customers?.phone) && (
                <p className="text-muted-foreground mt-1">
                  {[order.customers?.email, order.customers?.phone].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <p className="font-medium">{statusLabel[order.status] ?? order.status}</p>
            </div>
            {order.rejected_at && (
              <div>
                <p className="text-muted-foreground">Rejected</p>
                <p className="font-medium">
                  {new Date(order.rejected_at).toLocaleString('en-GB')}
                </p>
              </div>
            )}
            {order.deleted_at && (
              <div>
                <p className="text-muted-foreground">Deleted</p>
                <p className="font-medium">
                  {new Date(order.deleted_at).toLocaleString('en-GB')}
                </p>
              </div>
            )}
            <div>
              <p className="text-muted-foreground">Order date</p>
              <p className="font-medium">
                {order.order_date
                  ? new Date(order.order_date).toLocaleDateString('en-GB')
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">PO Number</p>
              {order.po_number ? (
                <button type="button" className="font-medium text-blue-600 hover:underline" onClick={() => void openPoPreview()}>
                  {order.po_number}
                </button>
              ) : (
                <p className="font-medium">—</p>
              )}
            </div>
            <div>
              <p className="text-muted-foreground">Delivery date</p>
              <p className="font-medium">
                {order.delivery_date
                  ? new Date(order.delivery_date).toLocaleDateString('en-GB')
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Total (INR)</p>
              <p className="font-medium text-lg">
                {order.total_amount != null ? `₹${Number(order.total_amount).toFixed(2)}` : '—'}
              </p>
            </div>
            {order.approved_at && (
              <div>
                <p className="text-muted-foreground">Approved</p>
                <p className="font-medium">
                  {new Date(order.approved_at).toLocaleString('en-GB')}
                </p>
              </div>
            )}
            {order.notes && (
              <div className="sm:col-span-2">
                <p className="text-muted-foreground">Notes</p>
                <p className="font-medium whitespace-pre-wrap">{order.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales Invoices</CardTitle>
            <CardDescription>Invoices generated against dispatch orders for this sales order.</CardDescription>
          </CardHeader>
          <CardContent>
            {salesInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales invoices generated yet.</p>
            ) : (
              <div className="space-y-2">
                {salesInvoiceGroups.map((group) => {
                  const isFamily = group.rows.length > 1
                  const expanded = Boolean(expandedInvoiceFamilies[group.key])
                  const first = group.rows[0]
                  return (
                    <div key={group.key} className="rounded-md border border-border/70">
                      <button
                        type="button"
                        disabled={!isFamily}
                        onClick={() =>
                          isFamily
                            ? setExpandedInvoiceFamilies((prev) => ({
                                ...prev,
                                [group.key]: !prev[group.key],
                              }))
                            : undefined
                        }
                        className="flex w-full items-center justify-between gap-2 p-3 text-left hover:bg-muted/40"
                      >
                        <span className="flex items-center gap-2">
                          {isFamily ? (
                            expanded ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />
                          ) : (
                            <span className="inline-block w-4" />
                          )}
                          <span className="font-mono">
                            {isFamily ? `${group.key}-...` : first.invoice_number}
                          </span>
                        </span>
                        <span className="text-xs text-muted-foreground">{group.rows.length} item(s)</span>
                      </button>

                      {isFamily && expanded ? (
                        <div className="space-y-1 border-t p-2">
                          {group.rows.map((inv) => (
                            <div key={inv.id} className="rounded border p-2">
                              <Link href={`/dashboard/finance/sales-invoices/${inv.id}`} className="font-mono text-blue-600 hover:underline">
                                {inv.invoice_number}
                              </Link>
                              <div className="mt-1 flex items-center justify-between text-sm">
                                <Link href={`/dashboard/finance/invoice-requests/${inv.dispatch_order_id}`} className="text-blue-600 hover:underline">
                                  {inv.dispatch_orders?.do_number ?? '—'}
                                </Link>
                                <span className={inv.status === 'active' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                  {inv.status === 'active' ? 'Active' : 'Cancelled'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle>Sales order items</CardTitle>
              <Button type="button" variant="outline" asChild>
                <Link href={`/dashboard/manufacturing/work-orders/generate/${id}`}>Create work order</Link>
              </Button>
            </div>
            <CardDescription>
              Open Create work order to pick the line and review the exploded BOM before saving.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty ordered</TableHead>
                    <TableHead className="text-right">Qty shipped</TableHead>
                    <TableHead className="text-right">Qty available</TableHead>
                    <TableHead className="text-right">Unit price</TableHead>
                    <TableHead className="text-right">Line total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7}>No lines</TableCell>
                    </TableRow>
                  ) : (
                    lines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell className="font-mono">
                          {line.items?.sku ? (
                            <Link
                              className="text-blue-600 hover:underline"
                              href={`/dashboard/inventory/items/${line.item_id}`}
                            >
                              {line.items.sku}
                            </Link>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>
                          {line.items?.name ? (
                            <Link
                              className="text-blue-600 hover:underline"
                              href={`/dashboard/inventory/items/${line.item_id}`}
                            >
                              {line.items.name}
                            </Link>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="text-right">{line.quantity}</TableCell>
                        <TableCell className="text-right">
                          {line.line_kind === 'stock'
                            ? qtyShippedForSoLine(line.id, line.item_id ?? '')
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {line.line_kind === 'stock' ? Number(inventoryMap[line.item_id ?? ''] ?? 0) : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {line.unit_price != null ? `₹${Number(line.unit_price).toFixed(2)}` : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {line.line_total != null ? `₹${Number(line.line_total).toFixed(2)}` : '—'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  {lines.length > 0 && (
                    <>
                      <TableRow className="bg-muted/40 font-semibold">
                        <TableCell colSpan={2}>Totals</TableCell>
                        <TableCell className="text-right">{totalQtyOrdered}</TableCell>
                        <TableCell colSpan={2}></TableCell>
                        <TableCell className="text-right">₹{subTotal.toFixed(2)}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                      <TableRow className="bg-muted/20">
                        <TableCell colSpan={5} className="text-right font-medium">
                          GST (18%)
                        </TableCell>
                        <TableCell className="text-right font-medium">₹{gstAmount.toFixed(2)}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                      <TableRow className="bg-muted/40 font-semibold">
                        <TableCell colSpan={5} className="text-right">
                          Grand Total
                        </TableCell>
                        <TableCell className="text-right">₹{grandTotal.toFixed(2)}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Work orders</CardTitle>
            <CardDescription>All work orders raised from this sales order (open a row for details).</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">Pick</TableHead>
                    <TableHead>WO number</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>SO line</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-muted-foreground">
                        No work orders yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    workOrders.map((wo) => {
                      const fg = (wo.work_order_lines ?? [])[0]
                      const soLineId = wo.sales_order_line_id
                      const soLine = stockLines.find((l) => l.id === soLineId)
                      return (
                        <TableRow key={wo.id}>
                          <TableCell>
                            <input type="checkbox" disabled title="Reserved for future bulk actions" />
                          </TableCell>
                          <TableCell>
                            <Link
                              href={`/dashboard/manufacturing/work-orders/${wo.id}`}
                              className="font-mono text-blue-600 hover:underline"
                            >
                              {wo.wo_number}
                            </Link>
                          </TableCell>
                          <TableCell>{fg?.items?.sku ?? fg?.items?.name ?? '—'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {soLine?.items?.sku ?? (soLineId ? 'Line' : '—')}
                          </TableCell>
                          <TableCell>
                            {workOrderStatusLabel[wo.status] ?? wo.status.replaceAll('_', ' ')}
                          </TableCell>
                        </TableRow>
                      )
                    })
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
