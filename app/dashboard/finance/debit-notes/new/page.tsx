'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type Supplier = {
  id: string
  name?: string | null
  supplier_code?: string | null
  gst_number?: string | null
  gst_name?: string | null
  gst_address?: string | null
  address?: string | null
  pan?: string | null
  supplier_country?: string | null
}

type PurchaseOrder = {
  id: string
  po_number?: string | null
  supplier_id?: string | null
  suppliers?: Supplier | null
  purchase_order_lines?: Array<{
    item_id: string
    unit_price?: number | null
    items?: { id?: string | null; sku?: string | null; name?: string | null } | null
  }> | null
}

type PurchaseReceipt = {
  id: string
  pr_number?: string | null
  seller_sales_invoice_number?: string | null
  received_at?: string | null
  purchase_order_id?: string | null
  supplier_id?: string | null
}

type PurchaseInvoice = {
  id: string
  pi_number: string
  purchase_order_id?: string | null
  supplier_id?: string | null
  purchase_invoice_receipts?: Array<{ purchase_receipts?: PurchaseReceipt | null }> | null
  purchase_orders?: { id?: string | null; po_number?: string | null } | null
  suppliers?: Supplier | null
}

type DraftLine = {
  id: string
  item_id: string | null
  sku: string
  item_name: string
  quantity: string
  unit_price: string
  return_item: boolean
}

function toLocalYmd(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function newLine(): DraftLine {
  return {
    id: crypto.randomUUID(),
    item_id: null,
    sku: '',
    item_name: '',
    quantity: '',
    unit_price: '',
    return_item: false,
  }
}

export default function CreateDebitNotePage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading create debit note form...</div>}>
      <CreateDebitNoteContent />
    </Suspense>
  )
}

function CreateDebitNoteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [receipts, setReceipts] = useState<PurchaseReceipt[]>([])
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [poSearch, setPoSearch] = useState('')
  const [prSearch, setPrSearch] = useState('')
  const [piSearch, setPiSearch] = useState('')
  const [supplierSearch, setSupplierSearch] = useState('')
  const [itemSearch, setItemSearch] = useState('')
  const [selectedPoId, setSelectedPoId] = useState('')
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null)
  const [selectedReceiptIds, setSelectedReceiptIds] = useState<string[]>([])
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([])
  const [selectedSupplierId, setSelectedSupplierId] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [debitNoteDate, setDebitNoteDate] = useState(toLocalYmd(new Date()))
  const [originalInvoiceNumber, setOriginalInvoiceNumber] = useState('')
  const [originalInvoiceDate, setOriginalInvoiceDate] = useState('')
  const [lines, setLines] = useState<DraftLine[]>([newLine()])

  useEffect(() => {
    void initialize()
  }, [])

  const initialize = async () => {
    setLoading(true)
    setError(null)
    try {
      const [ordersRes, receiptsRes, invoicesRes, suppliersRes] = await Promise.all([
        erpFetch<{ data: PurchaseOrder[] }>('/api/purchase/orders'),
        erpFetch<{ data: PurchaseReceipt[] }>('/api/purchase/receipts'),
        erpFetch<{ data: PurchaseInvoice[] }>('/api/purchase/invoices'),
        erpFetch<{ data: Supplier[] }>('/api/suppliers'),
      ])
      setOrders(ordersRes.data ?? [])
      setReceipts(receiptsRes.data ?? [])
      setInvoices(invoicesRes.data ?? [])
      setSuppliers(suppliersRes.data ?? [])

      const purchaseInvoiceId = searchParams.get('purchase_invoice_id')
      if (purchaseInvoiceId) {
        const invoiceRes = await erpFetch<{ data: PurchaseInvoice }>(`/api/purchase/invoices/${purchaseInvoiceId}`)
        const invoice = invoiceRes.data
        setSelectedInvoiceIds([invoice.id])
        setSelectedPoId(invoice.purchase_order_id ?? '')
        setSelectedSupplierId(invoice.supplier_id ?? invoice.suppliers?.id ?? '')
        setSelectedSupplier(invoice.suppliers ?? null)
        const linkedReceipts = (invoice.purchase_invoice_receipts ?? [])
          .map((row) => row.purchase_receipts)
          .filter(Boolean) as PurchaseReceipt[]
        setSelectedReceiptIds(linkedReceipts.map((receipt) => receipt.id))
        const firstReceipt = linkedReceipts[0]
        if (firstReceipt?.seller_sales_invoice_number) setOriginalInvoiceNumber(firstReceipt.seller_sales_invoice_number)
        if (firstReceipt?.received_at) setOriginalInvoiceDate(firstReceipt.received_at.slice(0, 10))
        if (invoice.purchase_order_id) {
          const poRes = await erpFetch<{ data: PurchaseOrder }>(`/api/purchase/orders/${invoice.purchase_order_id}`)
          setSelectedPo(poRes.data)
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load debit note form')
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = useMemo(() => {
    const term = poSearch.trim().toLowerCase()
    if (!term) return orders
    return orders.filter((order) => (order.po_number ?? '').toLowerCase().includes(term))
  }, [orders, poSearch])

  const filteredReceipts = useMemo(() => {
    const term = prSearch.trim().toLowerCase()
    return receipts.filter((receipt) => {
      if (selectedPoId && receipt.purchase_order_id !== selectedPoId) return false
      if (selectedSupplierId && receipt.supplier_id !== selectedSupplierId) return false
      if (!term) return true
      return (receipt.pr_number ?? '').toLowerCase().includes(term) || (receipt.seller_sales_invoice_number ?? '').toLowerCase().includes(term)
    })
  }, [receipts, prSearch, selectedPoId, selectedSupplierId])

  const filteredInvoices = useMemo(() => {
    const term = piSearch.trim().toLowerCase()
    return invoices.filter((invoice) => {
      if (selectedPoId && invoice.purchase_order_id !== selectedPoId) return false
      if (selectedSupplierId && invoice.supplier_id !== selectedSupplierId) return false
      if (!term) return true
      return invoice.pi_number.toLowerCase().includes(term)
    })
  }, [invoices, piSearch, selectedPoId, selectedSupplierId])

  const filteredSuppliers = useMemo(() => {
    const term = supplierSearch.trim().toLowerCase()
    if (!term) return suppliers
    return suppliers.filter((supplier) => {
      const label = `${supplier.supplier_code ?? ''} ${supplier.name ?? ''}`.toLowerCase()
      return label.includes(term)
    })
  }, [suppliers, supplierSearch])

  const poItems = useMemo(() => selectedPo?.purchase_order_lines ?? [], [selectedPo])

  const filteredPoItems = useMemo(() => {
    const term = itemSearch.trim().toLowerCase()
    if (!term) return poItems
    return poItems.filter((line) => {
      const sku = line.items?.sku ?? ''
      const name = line.items?.name ?? ''
      return sku.toLowerCase().includes(term) || name.toLowerCase().includes(term)
    })
  }, [poItems, itemSearch])

  const choosePo = async (order: PurchaseOrder) => {
    setSelectedPoId(order.id)
    setPoSearch(order.po_number ?? order.id)
    setSelectedSupplierId(order.supplier_id ?? order.suppliers?.id ?? '')
    setSelectedSupplier(order.suppliers ?? null)
    try {
      const res = await erpFetch<{ data: PurchaseOrder }>(`/api/purchase/orders/${order.id}`)
      setSelectedPo(res.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load purchase order')
    }
  }

  const chooseSupplier = (supplier: Supplier) => {
    setSelectedSupplierId(supplier.id)
    setSelectedSupplier(supplier)
    setSupplierSearch(`${supplier.supplier_code ? `${supplier.supplier_code} - ` : ''}${supplier.name ?? ''}`)
  }

  const addPoItem = (line: NonNullable<PurchaseOrder['purchase_order_lines']>[number]) => {
    setLines((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        item_id: line.item_id,
        sku: line.items?.sku ?? '',
        item_name: line.items?.name ?? '',
        quantity: '1',
        unit_price: String(line.unit_price ?? 0),
        return_item: false,
      },
    ])
    setItemSearch('')
  }

  const toggleReceipt = (receiptId: string) => {
    setSelectedReceiptIds((current) =>
      current.includes(receiptId) ? current.filter((id) => id !== receiptId) : [...current, receiptId],
    )
  }

  const toggleInvoice = (invoiceId: string) => {
    setSelectedInvoiceIds((current) =>
      current.includes(invoiceId) ? current.filter((id) => id !== invoiceId) : [...current, invoiceId],
    )
  }

  const updateLine = (lineId: string, patch: Partial<DraftLine>) => {
    setLines((current) => current.map((line) => (line.id === lineId ? { ...line, ...patch } : line)))
  }

  const removeLine = (lineId: string) => {
    setLines((current) => (current.length <= 1 ? current : current.filter((line) => line.id !== lineId)))
  }

  const generate = async () => {
    if (!selectedPoId && selectedReceiptIds.length === 0 && selectedInvoiceIds.length === 0) {
      setError('Choose at least one purchase order, purchase receipt, or purchase invoice.')
      return
    }
    if (!selectedSupplierId) {
      setError('Choose a supplier.')
      return
    }

    const normalizedLines = lines
      .map((line) => ({
        item_id: line.item_id,
        sku: line.sku.trim() || null,
        item_name: line.item_name.trim(),
        quantity: Number(line.quantity),
        unit_price: Number(line.unit_price),
        return_item: line.return_item,
      }))
      .filter((line) => line.item_name && Number.isFinite(line.quantity) && line.quantity > 0)

    if (normalizedLines.length === 0) {
      setError('Add at least one item with quantity and price.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const res = await erpFetch<{ data: { id: string } }>('/api/debit-notes', {
        method: 'POST',
        body: {
          purchase_order_id: selectedPoId || null,
          purchase_receipt_ids: selectedReceiptIds,
          purchase_invoice_ids: selectedInvoiceIds,
          supplier_id: selectedSupplierId,
          debit_note_date: debitNoteDate,
          original_invoice_number: originalInvoiceNumber.trim() || null,
          original_invoice_date: originalInvoiceDate || null,
          lines: normalizedLines,
        },
      })
      router.push(`/dashboard/finance/debit-notes/${res.data.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate debit note')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading create debit note form...</div>

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/finance/debit-notes">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft size={16} />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Create Debit Note</h1>
          <p className="text-sm text-muted-foreground">Issue a debit note against a purchase order, receipt, or invoice.</p>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Linked Purchase Documents</CardTitle>
          <CardDescription>Choose at least one PO, PR, or PI to proceed.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="space-y-2">
            <p className="text-sm font-medium">Purchase Order</p>
            <Input placeholder="Search PO..." value={poSearch} onChange={(e) => setPoSearch(e.target.value)} />
            <div className="max-h-40 space-y-1 overflow-auto rounded-md border p-2">
              {filteredOrders.map((order) => (
                <button
                  key={order.id}
                  type="button"
                  className={`block w-full rounded px-2 py-1 text-left text-sm hover:bg-muted ${selectedPoId === order.id ? 'bg-muted font-medium' : ''}`}
                  onClick={() => void choosePo(order)}
                >
                  {order.po_number ?? order.id}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Purchase Receipts</p>
            <Input placeholder="Search PR..." value={prSearch} onChange={(e) => setPrSearch(e.target.value)} />
            <div className="max-h-40 space-y-2 overflow-auto rounded-md border p-2">
              {filteredReceipts.map((receipt) => (
                <label key={receipt.id} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={selectedReceiptIds.includes(receipt.id)} onCheckedChange={() => toggleReceipt(receipt.id)} />
                  <span>{receipt.pr_number ?? receipt.id}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Purchase Invoices</p>
            <Input placeholder="Search PI..." value={piSearch} onChange={(e) => setPiSearch(e.target.value)} />
            <div className="max-h-40 space-y-2 overflow-auto rounded-md border p-2">
              {filteredInvoices.map((invoice) => (
                <label key={invoice.id} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={selectedInvoiceIds.includes(invoice.id)} onCheckedChange={() => toggleInvoice(invoice.id)} />
                  <span>{invoice.pi_number}</span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Supplier</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Search supplier..." value={supplierSearch} onChange={(e) => setSupplierSearch(e.target.value)} />
          <div className="max-h-40 space-y-1 overflow-auto rounded-md border p-2">
            {filteredSuppliers.map((supplier) => (
              <button
                key={supplier.id}
                type="button"
                className={`block w-full rounded px-2 py-1 text-left text-sm hover:bg-muted ${selectedSupplierId === supplier.id ? 'bg-muted font-medium' : ''}`}
                onClick={() => chooseSupplier(supplier)}
              >
                {supplier.supplier_code ? `${supplier.supplier_code} - ` : ''}
                {supplier.name}
              </button>
            ))}
          </div>
          {selectedSupplier ? (
            <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
              <div><p className="text-muted-foreground">GST</p><p>{selectedSupplier.gst_number ?? '—'}</p></div>
              <div><p className="text-muted-foreground">PAN</p><p>{selectedSupplier.pan ?? '—'}</p></div>
              <div><p className="text-muted-foreground">Country</p><p>{selectedSupplier.supplier_country ?? '—'}</p></div>
              <div className="md:col-span-3"><p className="text-muted-foreground">Address</p><p>{selectedSupplier.gst_address ?? selectedSupplier.address ?? '—'}</p></div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
          <CardDescription>Search items from the selected PO or add another row manually.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              className="max-w-md"
              placeholder="Search items from PO..."
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              disabled={!selectedPo}
            />
            <Button type="button" variant="outline" onClick={() => setLines((current) => [...current, newLine()])}>
              Other
            </Button>
          </div>
          {selectedPo ? (
            <div className="max-h-40 space-y-1 overflow-auto rounded-md border p-2">
              {filteredPoItems.map((line) => (
                <button
                  key={`${line.item_id}-${line.items?.sku ?? ''}`}
                  type="button"
                  className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-muted"
                  onClick={() => addPoItem(line)}
                >
                  {line.items?.sku ?? '—'} — {line.items?.name ?? '—'}
                </button>
              ))}
            </div>
          ) : null}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Return Item</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>
                    <Input value={line.sku} onChange={(e) => updateLine(line.id, { sku: e.target.value })} />
                  </TableCell>
                  <TableCell>
                    <Input value={line.item_name} onChange={(e) => updateLine(line.id, { item_name: e.target.value })} />
                  </TableCell>
                  <TableCell>
                    <Input value={line.quantity} onChange={(e) => updateLine(line.id, { quantity: e.target.value })} />
                  </TableCell>
                  <TableCell>
                    <Input value={line.unit_price} onChange={(e) => updateLine(line.id, { unit_price: e.target.value })} />
                  </TableCell>
                  <TableCell>
                    <Checkbox
                      checked={line.return_item}
                      onCheckedChange={(checked) => updateLine(line.id, { return_item: Boolean(checked) })}
                    />
                  </TableCell>
                  <TableCell>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeLine(line.id)}>
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm font-medium">Debit Note Date</p>
              <Input type="date" value={debitNoteDate} onChange={(e) => setDebitNoteDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Original Invoice Number</p>
              <Input value={originalInvoiceNumber} onChange={(e) => setOriginalInvoiceNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Original Invoice Date</p>
              <Input type="date" value={originalInvoiceDate} onChange={(e) => setOriginalInvoiceDate(e.target.value)} />
            </div>
          </div>
          <Button onClick={() => void generate()} disabled={saving}>
            {saving ? 'Generating...' : 'Generate Debit Note'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
