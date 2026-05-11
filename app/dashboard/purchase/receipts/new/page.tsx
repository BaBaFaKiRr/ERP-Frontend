'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type PurchaseOrderLine = {
  item_id: string
  quantity?: number | null
  unit_price?: number | null
  items?: { id: string; sku: string; name: string } | null
}

type PurchaseOrder = {
  id: string
  po_number?: string | null
  status: string
  supplier_id?: string | null
  suppliers?: { id?: string | null; supplier_code?: string | null; name?: string | null } | null
  purchase_order_lines?: PurchaseOrderLine[] | null
  purchase_receipts?: Array<{
    id: string
    status?: string | null
    purchase_receipt_lines?: Array<{ item_id?: string | null; quantity?: number | null }> | null
  }> | null
}

type ReceiptItem = {
  item_id: string
  qty_received: number
  unit_price: number
}

export default function AddPurchaseReceiptPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [orders, setOrders] = useState<PurchaseOrder[]>([])

  const [poSearch, setPoSearch] = useState('')
  const [selectedPoId, setSelectedPoId] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [uploadedBy, setUploadedBy] = useState('')
  const [uploadedAt, setUploadedAt] = useState('')
  const [receivedAt, setReceivedAt] = useState('')
  const [sellerSalesInvoiceNumber, setSellerSalesInvoiceNumber] = useState('')
  const [totalReceiptAmount, setTotalReceiptAmount] = useState('')
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([])
  const [sellerSalesInvoiceFile, setSellerSalesInvoiceFile] = useState<File | null>(null)
  const [freightCharges, setFreightCharges] = useState('')
  const [freightPaidBy, setFreightPaidBy] = useState('')
  const [isItemPaid, setIsItemPaid] = useState(false)
  const [amountPaid, setAmountPaid] = useState('')
  const [paymentReceiptFile, setPaymentReceiptFile] = useState<File | null>(null)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    void initialize()
  }, [])

  const initialize = async () => {
    setLoading(true)
    setError(null)
    try {
      const [ordersRes, meRes] = await Promise.all([
        erpFetch<{ data: PurchaseOrder[] }>('/api/purchase/orders'),
        erpFetch<{ user: { firstName: string | null; lastName: string | null; email: string } }>('/api/me'),
      ])
      setOrders((ordersRes.data ?? []).filter((order) => order.status !== 'closed'))
      const name = `${meRes.user.firstName ?? ''} ${meRes.user.lastName ?? ''}`.trim() || meRes.user.email
      setUploadedBy(name)
      setUploadedAt(new Date().toLocaleString('en-IN'))
      setReceivedAt(new Date().toISOString().slice(0, 10))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load page')
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = useMemo(() => {
    const term = poSearch.trim().toLowerCase()
    if (!term) return orders
    return orders.filter((order) => (order.po_number ?? '').toLowerCase().includes(term))
  }, [orders, poSearch])

  const selectedPo = useMemo(() => orders.find((order) => order.id === selectedPoId) ?? null, [orders, selectedPoId])
  const selectedSupplier = selectedPo?.suppliers ?? null
  const selectedSupplierLabel = selectedSupplier
    ? `${selectedSupplier.supplier_code?.trim() ? `${selectedSupplier.supplier_code} - ` : ''}${selectedSupplier.name ?? '-'}`
    : '-'

  const receivedQtyByItem = (po: PurchaseOrder) => {
    const quantities = new Map<string, number>()
    for (const receipt of po.purchase_receipts ?? []) {
      if (receipt.status === 'cancelled') continue
      for (const line of receipt.purchase_receipt_lines ?? []) {
        const itemId = line.item_id ?? ''
        if (!itemId) continue
        quantities.set(itemId, (quantities.get(itemId) ?? 0) + Number(line.quantity ?? 0))
      }
    }
    return quantities
  }

  const pendingQtyForLine = (po: PurchaseOrder, line: PurchaseOrderLine) => {
    const received = receivedQtyByItem(po).get(line.item_id) ?? 0
    return Math.max(Number(line.quantity ?? 0) - received, 0)
  }

  const applyPoAutofill = (po: PurchaseOrder) => {
    setSelectedPoId(po.id)
    setSupplierId(po.supplier_id ?? po.suppliers?.id ?? '')
    const poItems = (po.purchase_order_lines ?? [])
      .map((line) => ({
        item_id: line.item_id,
        qty_received: pendingQtyForLine(po, line),
        unit_price: Number(line.unit_price ?? 0),
      }))
      .filter((line) => line.qty_received > 0)
    setReceiptItems(poItems)
    const amount = poItems.reduce((sum, row) => sum + row.qty_received * row.unit_price, 0)
    setTotalReceiptAmount(amount > 0 ? amount.toFixed(2) : '')
    setError(null)
  }

  const syncReceiptItems = (nextItems: ReceiptItem[]) => {
    setReceiptItems(nextItems)
    const amount = nextItems.reduce((sum, row) => sum + row.qty_received * row.unit_price, 0)
    setTotalReceiptAmount(amount > 0 ? amount.toFixed(2) : '')
  }

  const updateReceiptItemQty = (itemId: string, value: string, maxQty: number) => {
    const rawQty = value === '' ? 0 : Number(value)
    const nextQty = Math.min(Math.max(rawQty || 0, 0), maxQty)
    syncReceiptItems(receiptItems.map((row) => (row.item_id === itemId ? { ...row, qty_received: nextQty } : row)))
  }

  const removeReceiptItem = (itemId: string) => {
    syncReceiptItems(receiptItems.filter((row) => row.item_id !== itemId))
  }

  const save = async () => {
    if (!selectedPoId) {
      setError('Purchase order is required.')
      return
    }
    if (!supplierId) {
      setError('Selected purchase order does not have a supplier.')
      return
    }
    if (!sellerSalesInvoiceNumber.trim()) {
      setError('Seller sales invoice number is required.')
      return
    }
    if (!sellerSalesInvoiceFile) {
      setError('Please upload seller sales invoice file.')
      return
    }
    if (receiptItems.length === 0) {
      setError('Please add at least one item.')
      return
    }
    if (receiptItems.some((row) => Number(row.qty_received) <= 0)) {
      setError('Each item must have qty received greater than 0.')
      return
    }
    if (Number(totalReceiptAmount || 0) <= 0) {
      setError('Total receipt amount must be greater than 0.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('supplier_id', supplierId)
      formData.append('purchase_order_id', selectedPoId)
      formData.append('uploaded_by_name', uploadedBy)
      formData.append('uploaded_at', new Date().toISOString())
      formData.append('received_at', receivedAt)
      formData.append('seller_sales_invoice_number', sellerSalesInvoiceNumber.trim())
      formData.append('total_receipt_amount', totalReceiptAmount || '0')
      formData.append('notes', notes)
      formData.append('freight_charges', freightCharges || '0')
      formData.append('freight_paid_by', freightPaidBy)
      formData.append('is_item_paid', String(isItemPaid))
      formData.append('amount_paid', amountPaid || '0')
      formData.append(
        'lines',
        JSON.stringify(
          receiptItems.map((row) => ({
            item_id: row.item_id,
            quantity: Number(row.qty_received || 0),
            unit_price: Number(row.unit_price || 0),
          })),
        ),
      )
      formData.append('seller_sales_invoice_file', sellerSalesInvoiceFile)
      if (paymentReceiptFile) formData.append('payment_receipt_file', paymentReceiptFile)

      await erpFetch('/api/purchase/receipts', { method: 'POST', body: formData })
      window.location.href = '/dashboard/purchase/receipts'
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save purchase receipt')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading add receipt form...</div>

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/purchase/receipts">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft size={16} />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Add Purchase Receipt</h1>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Purchase Order *</CardTitle>
          <CardDescription>Select a purchase order first. The receipt details and items are filled from it.</CardDescription>
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
                onClick={() => applyPoAutofill(order)}
              >
                {order.po_number ?? order.id} ({order.status})
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {!selectedPo ? (
        <span className="text-sm text-muted-foreground"></span>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Receipt Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="mb-1 text-sm font-medium">Supplier</p>
                <Input value={selectedSupplierLabel} disabled />
              </div>
              <div>
                <p className="mb-1 text-sm font-medium">Uploaded by</p>
                <Input value={uploadedBy} disabled />
              </div>
              <div>
                <p className="mb-1 text-sm font-medium">Date & Time of Upload</p>
                <Input value={uploadedAt} disabled />
              </div>
              <div>
                <p className="mb-1 text-sm font-medium">Received at</p>
                <Input type="date" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} />
              </div>
              <div>
                <p className="mb-1 text-sm font-medium">Seller's Sales Invoice Number *</p>
                <Input value={sellerSalesInvoiceNumber} onChange={(e) => setSellerSalesInvoiceNumber(e.target.value)} />
              </div>
              <div>
                <p className="mb-1 text-sm font-medium">Total Receipt Amount</p>
                <Input type="number" step="0.01" value={totalReceiptAmount} disabled />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent>
              {receiptItems.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Item Name</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receiptItems.map((row) => {
                      const line = selectedPo.purchase_order_lines?.find((poLine) => poLine.item_id === row.item_id)
                      const maxQty = line ? pendingQtyForLine(selectedPo, line) : 0
                      const total = row.qty_received * row.unit_price
                      return (
                        <TableRow key={row.item_id}>
                          <TableCell className="font-mono">{line?.items?.sku ?? '-'}</TableCell>
                          <TableCell>{line?.items?.name ?? '-'}</TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min="0"
                              max={maxQty}
                              value={row.qty_received === 0 ? '' : String(row.qty_received)}
                              onChange={(e) => updateReceiptItemQty(row.item_id, e.target.value, maxQty)}
                              className="ml-auto w-28 text-right"
                            />
                          </TableCell>
                          <TableCell className="text-right">₹{row.unit_price.toFixed(2)}</TableCell>
                          <TableCell className="text-right">₹{total.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeReceiptItem(row.item_id)}>
                              <Trash2 size={14} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">No pending items found on the selected purchase order.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Documents and Payment</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="mb-1 text-sm font-medium">Upload Seller's Sales Invoice *</p>
                <Input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={(e) => setSellerSalesInvoiceFile(e.target.files?.[0] ?? null)} />
              </div>
              <div>
                <p className="mb-1 text-sm font-medium">Freight Charges Paid</p>
                <Input type="number" step="0.01" value={freightCharges} onChange={(e) => setFreightCharges(e.target.value)} />
              </div>
              <div>
                <p className="mb-1 text-sm font-medium">Freight Charges Paid By</p>
                <Input value={freightPaidBy} onChange={(e) => setFreightPaidBy(e.target.value)} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Checkbox checked={isItemPaid} onCheckedChange={(checked) => setIsItemPaid(Boolean(checked))} />
                <p className="text-sm font-medium">Is the Item Paid for?</p>
              </div>

              {isItemPaid && (
                <>
                  <div>
                    <p className="mb-1 text-sm font-medium">Amount Paid</p>
                    <Input type="number" step="0.01" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} />
                  </div>
                  <div>
                    <p className="mb-1 text-sm font-medium">Upload Payment Receipt (optional)</p>
                    <Input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={(e) => setPaymentReceiptFile(e.target.files?.[0] ?? null)} />
                  </div>
                </>
              )}
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
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
