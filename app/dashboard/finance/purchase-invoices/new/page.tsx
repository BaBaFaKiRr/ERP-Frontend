'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  PurchaseInvoiceDiscrepancyDetails,
  type PurchaseInvoiceDiscrepancy,
} from '../_components/purchase-invoice-discrepancy-details'

type PurchaseOrder = {
  id: string
  po_number?: string | null
  status: string
  suppliers?: { supplier_code?: string | null; name?: string | null } | null
}

type PurchaseOrderLine = {
  item_id: string
  unit_price?: number | null
  items?: { id?: string | null; sku?: string | null; name?: string | null } | null
}

type PurchaseReceipt = {
  id: string
  pr_number?: string | null
  status?: string | null
  seller_sales_invoice_number?: string | null
  total_amount?: number | null
  amount_paid?: number | null
  is_item_paid?: boolean | null
  payment_status?: string | null
  purchase_receipt_lines?: Array<{
    item_id?: string | null
    quantity?: number | null
    unit_price?: number | null
    items?: { sku?: string | null; name?: string | null } | null
  }> | null
  purchase_receipt_discrepancies?: PurchaseInvoiceDiscrepancy[] | null
  purchase_invoice_receipts?: Array<{ purchase_invoices?: { id?: string | null; pi_number?: string | null } | null }> | null
}

type PurchaseOrderDetail = PurchaseOrder & {
  purchase_order_lines?: PurchaseOrderLine[] | null
  purchase_receipts?: PurchaseReceipt[] | null
}

type DraftReceiptLine = {
  item_id: string
  sku: string
  item_name: string
  quantity: string
  unit_price: string
}

type DraftReceipt = PurchaseReceipt & {
  draftLines: DraftReceiptLine[]
}

export default function GeneratePurchaseInvoicePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [poSearch, setPoSearch] = useState('')
  const [selectedPoId, setSelectedPoId] = useState('')
  const [selectedPo, setSelectedPo] = useState<PurchaseOrderDetail | null>(null)
  const [selectedReceiptIds, setSelectedReceiptIds] = useState<string[]>([])
  const [addedReceipts, setAddedReceipts] = useState<DraftReceipt[]>([])
  const [notes, setNotes] = useState('')

  useEffect(() => {
    void initialize()
  }, [])

  const initialize = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await erpFetch<{ data: PurchaseOrder[] }>('/api/purchase/orders')
      setOrders((res.data ?? []).filter((order) => order.status !== 'closed'))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load purchase orders')
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = useMemo(() => {
    const term = poSearch.trim().toLowerCase()
    if (!term) return orders
    return orders.filter((order) => (order.po_number ?? '').toLowerCase().includes(term))
  }, [orders, poSearch])

  const poUnitPriceByItem = useMemo(() => {
    const prices = new Map<string, number>()
    for (const line of selectedPo?.purchase_order_lines ?? []) {
      prices.set(line.item_id, Number(line.unit_price ?? 0))
    }
    return prices
  }, [selectedPo])

  const availableReceipts = useMemo(() => {
    return (selectedPo?.purchase_receipts ?? []).filter((receipt) => {
      if (receipt.status === 'cancelled') return false
      if ((receipt.purchase_invoice_receipts ?? []).length > 0) return false
      if (addedReceipts.some((row) => row.id === receipt.id)) return false
      return true
    })
  }, [selectedPo, addedReceipts])

  const buildDraftReceipt = (receipt: PurchaseReceipt): DraftReceipt => ({
    ...receipt,
    draftLines: (receipt.purchase_receipt_lines ?? [])
      .map((line) => {
        const itemId = String(line.item_id ?? '')
        if (!itemId) return null
        const unitPrice = poUnitPriceByItem.get(itemId) ?? Number(line.unit_price ?? 0)
        return {
          item_id: itemId,
          sku: line.items?.sku ?? '',
          item_name: line.items?.name ?? '',
          quantity: String(Number(line.quantity ?? 0)),
          unit_price: unitPrice > 0 ? unitPrice.toFixed(2) : '',
        }
      })
      .filter((line): line is DraftReceiptLine => Boolean(line)),
  })

  const loadPurchaseOrder = async (orderId: string) => {
    setError(null)
    try {
      const res = await erpFetch<{ data: PurchaseOrderDetail }>(`/api/purchase/orders/${orderId}`)
      setSelectedPoId(orderId)
      setSelectedPo(res.data)
      setSelectedReceiptIds([])
      setAddedReceipts([])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load purchase order')
    }
  }

  const toggleReceiptSelection = (receiptId: string, checked: boolean) => {
    setSelectedReceiptIds((current) => {
      if (checked) return [...current, receiptId]
      return current.filter((id) => id !== receiptId)
    })
  }

  const addSelectedReceipts = () => {
    const next = availableReceipts.filter((receipt) => selectedReceiptIds.includes(receipt.id))
    if (next.length === 0) {
      setError('Select at least one purchase receipt to add.')
      return
    }
    setAddedReceipts((current) => [...current, ...next.map((receipt) => buildDraftReceipt(receipt))])
    setSelectedReceiptIds([])
    setError(null)
  }

  const removeAddedReceipt = (receiptId: string) => {
    setAddedReceipts((current) => current.filter((receipt) => receipt.id !== receiptId))
  }

  const updateDraftLine = (
    receiptId: string,
    itemId: string,
    field: 'quantity' | 'unit_price',
    value: string,
  ) => {
    setAddedReceipts((current) =>
      current.map((receipt) =>
        receipt.id !== receiptId
          ? receipt
          : {
              ...receipt,
              draftLines: receipt.draftLines.map((line) =>
                line.item_id === itemId ? { ...line, [field]: value } : line,
              ),
            },
      ),
    )
  }

  const lineTotal = (line: DraftReceiptLine) => {
    const qty = Number(line.quantity || 0)
    const price = Number(line.unit_price || 0)
    return qty * price
  }

  const receiptDraftTotal = (receipt: DraftReceipt) =>
    receipt.draftLines.reduce((sum, line) => sum + lineTotal(line), 0)

  const totalAmount = addedReceipts.reduce((sum, receipt) => sum + receiptDraftTotal(receipt), 0)

  const openSellerSalesInvoice = async (receiptId: string) => {
    setError(null)
    try {
      const res = await erpFetch<{ data: { signed_url: string } }>(
        `/api/purchase/receipts/${receiptId}/seller-sales-invoice-url`,
      )
      window.open(res.data.signed_url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to open seller sales invoice preview')
    }
  }

  const save = async () => {
    if (!selectedPoId) {
      setError('Purchase order is required.')
      return
    }
    if (addedReceipts.length === 0) {
      setError('Add at least one purchase receipt to the invoice.')
      return
    }
    if (addedReceipts.some((receipt) => receipt.draftLines.length === 0)) {
      setError('Each added purchase receipt must have at least one item line.')
      return
    }
    if (
      addedReceipts.some((receipt) =>
        receipt.draftLines.some(
          (line) => Number(line.quantity || 0) <= 0 || Number(line.unit_price || 0) < 0,
        ),
      )
    ) {
      setError('Each item must have quantity greater than 0 and a valid price.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const res = await erpFetch<{ data: { id: string } }>('/api/purchase/invoices', {
        method: 'POST',
        body: {
          purchase_order_id: selectedPoId,
          purchase_receipt_ids: addedReceipts.map((receipt) => receipt.id),
          notes,
          lines: addedReceipts.flatMap((receipt) =>
            receipt.draftLines.map((line) => ({
              purchase_receipt_id: receipt.id,
              item_id: line.item_id,
              quantity: Number(line.quantity || 0),
              unit_price: Number(line.unit_price || 0),
            })),
          ),
        },
      })
      window.location.href = `/dashboard/finance/purchase-invoices/${res.data.id}`
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate purchase invoice')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading purchase invoice form...</div>

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/finance/purchase-invoices">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft size={16} />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Generate Purchase Invoice</h1>
          <p className="text-sm text-muted-foreground">Choose a purchase order and add one or more purchase receipts.</p>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Choose Purchase Order</CardTitle>
          <CardDescription>Select the purchase order whose receipts should be invoiced together.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Search purchase order by PO number..."
            value={poSearch}
            onChange={(e) => setPoSearch(e.target.value)}
          />
          <div className="max-h-40 overflow-auto rounded-md border p-2">
            {filteredOrders.map((order) => (
              <button
                key={order.id}
                type="button"
                className={`mb-1 w-full rounded px-3 py-2 text-left text-sm ${
                  selectedPoId === order.id ? 'bg-blue-100 dark:bg-blue-900/40' : 'hover:bg-muted'
                }`}
                onClick={() => void loadPurchaseOrder(order.id)}
              >
                {order.po_number ?? order.id} ({order.status})
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedPo && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Purchase Receipts on PO</CardTitle>
              <CardDescription>Select one or more receipts and add them to the invoice draft.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {availableReceipts.length > 0 ? (
                <div className="space-y-2">
                  {availableReceipts.map((receipt) => (
                    <label key={receipt.id} className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
                      <Checkbox
                        checked={selectedReceiptIds.includes(receipt.id)}
                        onCheckedChange={(checked) => toggleReceiptSelection(receipt.id, Boolean(checked))}
                      />
                      <span className="font-mono">{receipt.pr_number ?? receipt.id}</span>
                      <span className="text-muted-foreground">{receipt.seller_sales_invoice_number ?? 'No seller invoice number'}</span>
                      <span className="ml-auto">₹{Number(receipt.total_amount ?? 0).toFixed(2)}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No available purchase receipts found for this purchase order.</p>
              )}
              <Button type="button" variant="outline" onClick={addSelectedReceipts} disabled={selectedReceiptIds.length === 0}>
                Add selected receipts
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invoice Draft</CardTitle>
              <CardDescription>Review seller invoices, received items, reported issues, and partial payments.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {addedReceipts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No purchase receipts added yet.</p>
              ) : (
                addedReceipts.map((receipt) => (
                  <div key={receipt.id} className="space-y-4 rounded-md border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <Link
                          href={`/dashboard/purchase/receipts/${receipt.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono font-medium hover:underline"
                        >
                          {receipt.pr_number ?? receipt.id}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          Seller sales invoice:{' '}
                          {receipt.seller_sales_invoice_number ? (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 hover:underline"
                              onClick={() => void openSellerSalesInvoice(receipt.id)}
                            >
                              {receipt.seller_sales_invoice_number}
                              <ExternalLink size={14} aria-hidden="true" />
                              <span className="sr-only">Open seller sales invoice in a new tab</span>
                            </button>
                          ) : (
                            '—'
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeAddedReceipt(receipt.id)}>
                          Remove
                        </Button>
                        <p className="text-sm font-medium">₹{receiptDraftTotal(receipt).toFixed(2)}</p>
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-sm font-medium">Received items</p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>SKU</TableHead>
                            <TableHead>Item</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead className="text-right">Line Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {receipt.draftLines.map((line) => (
                            <TableRow key={`${receipt.id}-${line.item_id}`}>
                              <TableCell className="font-mono">{line.sku || '—'}</TableCell>
                              <TableCell>{line.item_name || '—'}</TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.001"
                                  value={line.quantity}
                                  onChange={(e) => updateDraftLine(receipt.id, line.item_id, 'quantity', e.target.value)}
                                  className="ml-auto w-28 text-right"
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={line.unit_price}
                                  onChange={(e) => updateDraftLine(receipt.id, line.item_id, 'unit_price', e.target.value)}
                                  className="ml-auto w-28 text-right"
                                />
                              </TableCell>
                              <TableCell className="text-right">₹{lineTotal(line).toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div>
                      <p className="mb-2 text-sm font-medium">Reported issues</p>
                      <PurchaseInvoiceDiscrepancyDetails discrepancies={receipt.purchase_receipt_discrepancies ?? []} />
                    </div>

                    <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
                      <div>
                        <p className="text-muted-foreground">Payment status</p>
                        <p className="font-medium">{receipt.payment_status ?? 'UNPAID'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Amount paid</p>
                        <p className="font-medium">₹{Number(receipt.amount_paid ?? 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Marked paid on receipt</p>
                        <p className="font-medium">{receipt.is_item_paid ? 'Yes' : 'No'}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}

              <div className="flex items-center justify-between border-t pt-4">
                <p className="text-sm font-medium">Invoice total</p>
                <p className="text-lg font-semibold">₹{totalAmount.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? 'Generating...' : 'Generate Purchase Invoice'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
