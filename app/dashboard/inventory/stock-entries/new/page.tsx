'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, ClipboardPlus } from 'lucide-react'
import {
  ItemSearchField,
  type ItemSearchValue,
} from '@/components/inventory/item-search-field'
import { erpFetch } from '@/lib/erp-api'

type LineDraft = {
  item: ItemSearchValue | null
  quantity: string
  direction: 'in' | 'out'
}

type Reason = 'purchase' | 'sales' | 'material_issue' | 'material_deposit' | 'other'

type PurchaseOrderRef = {
  id: string
  po_number: string
  supplier_name: string | null
  status: string | null
}

type SalesInvoiceRef = {
  id: string
  invoice_number: string
  status: string | null
}

type WarehouseOption = {
  id: string
  name: string
  is_default?: boolean
}

export default function CreateStockEntryPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [createdBy, setCreatedBy] = useState('')
  const [reason, setReason] = useState<Reason>('material_issue')
  const [notes, setNotes] = useState('')
  const [otherDescription, setOtherDescription] = useState('')
  const [purchaseInvoiceFile, setPurchaseInvoiceFile] = useState<File | null>(null)
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderRef[]>([])
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoiceRef[]>([])
  const [poSearch, setPoSearch] = useState('')
  const [invoiceSearch, setInvoiceSearch] = useState('')
  const [selectedPoIds, setSelectedPoIds] = useState<string[]>([])
  const [selectedSalesInvoiceIds, setSelectedSalesInvoiceIds] = useState<string[]>([])
  const [lines, setLines] = useState<LineDraft[]>([
    { item: null, quantity: '', direction: 'in' },
  ])
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([])
  const [warehouseId, setWarehouseId] = useState('')

  useEffect(() => {
    void (async () => {
      try {
        const res = await erpFetch<{ user: { firstName: string | null; lastName: string | null; email: string } }>(
          '/api/me',
        )
        const name = `${res.user.firstName ?? ''} ${res.user.lastName ?? ''}`.trim() || res.user.email
        setCreatedBy(name)
      } catch {
        setCreatedBy('')
      }
    })()
    void erpFetch<{ data: WarehouseOption[] }>('/api/warehouses')
      .then((res) => {
        const rows = res.data ?? []
        setWarehouses(rows)
        const defaultWh = rows.find((w) => w.is_default) ?? rows[0]
        if (defaultWh) setWarehouseId(defaultWh.id)
      })
      .catch(() => setWarehouses([]))
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (reason !== 'purchase' && reason !== 'sales') return
      try {
        if (reason === 'purchase' && purchaseOrders.length === 0) {
          const res = await erpFetch<{ data: PurchaseOrderRef[] }>('/api/purchase/orders')
          if (!cancelled) setPurchaseOrders(res.data ?? [])
        }
        if (reason === 'sales' && salesInvoices.length === 0) {
          const res = await erpFetch<{ data: SalesInvoiceRef[] }>('/api/dispatch-sales-invoices')
          if (!cancelled) setSalesInvoices(res.data ?? [])
        }
      } catch {
        // Keep form usable even if references fail to load.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [reason, purchaseOrders.length, salesInvoices.length])

  const updateLine = (index: number, patch: Partial<LineDraft>) => {
    setLines((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const addLine = () => {
    setLines((prev) => [...prev, { item: null, quantity: '', direction: 'in' }])
  }

  const removeLine = (index: number) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const parsedLines: { item_id: string; quantity: number; direction: 'in' | 'out' }[] = []
    for (const row of lines) {
      if (!row.item && !row.quantity.trim()) continue
      if (!row.item || !row.quantity.trim()) {
        alert('Each line needs both item and quantity, or clear empty lines')
        return
      }
      const q = Number(row.quantity)
      if (Number.isNaN(q) || q <= 0) {
        alert('Quantities must be positive numbers')
        return
      }
      parsedLines.push({
        item_id: row.item.id,
        quantity: q,
        direction: row.direction,
      })
    }

    if (parsedLines.length === 0) {
      alert('Add at least one line with item and quantity')
      return
    }

    if (reason === 'purchase' && selectedPoIds.length === 0) {
      alert('Select at least one purchase order')
      return
    }
    if (reason === 'sales' && selectedSalesInvoiceIds.length === 0) {
      alert('Select at least one sales invoice')
      return
    }
    if (reason === 'other' && !otherDescription.trim()) {
      alert('Description is required for Other reason')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        reason,
        notes: notes.trim() || undefined,
        lines: parsedLines,
        selected_purchase_order_ids: selectedPoIds,
        selected_sales_invoice_ids: selectedSalesInvoiceIds,
        other_description: otherDescription.trim() || undefined,
        warehouse_id: warehouseId || undefined,
      }
      if (reason === 'purchase' && purchaseInvoiceFile) {
        const formData = new FormData()
        formData.append('reason', payload.reason)
        formData.append('lines', JSON.stringify(payload.lines))
        formData.append('notes', payload.notes ?? '')
        formData.append('selected_purchase_order_ids', JSON.stringify(payload.selected_purchase_order_ids))
        formData.append('selected_sales_invoice_ids', JSON.stringify(payload.selected_sales_invoice_ids))
        formData.append('other_description', payload.other_description ?? '')
        if (payload.warehouse_id) formData.append('warehouse_id', payload.warehouse_id)
        formData.append('purchase_invoice', purchaseInvoiceFile)
        await erpFetch('/api/stock-entries/adjustment', {
          method: 'POST',
          body: formData,
        })
      } else {
        await erpFetch('/api/stock-entries/adjustment', {
          method: 'POST',
          body: payload,
        })
      }
      router.push('/dashboard/inventory/stock-entries')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to post stock entry')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredPurchaseOrders = purchaseOrders.filter((po) => {
    const q = poSearch.trim().toLowerCase()
    if (!q) return true
    return (
      po.po_number.toLowerCase().includes(q) ||
      (po.supplier_name ?? '').toLowerCase().includes(q) ||
      (po.status ?? '').toLowerCase().includes(q)
    )
  })
  const filteredSalesInvoices = salesInvoices.filter((inv) => {
    const q = invoiceSearch.trim().toLowerCase()
    if (!q) return true
    return inv.invoice_number.toLowerCase().includes(q) || (inv.status ?? '').toLowerCase().includes(q)
  })
  const toggleSelected = (id: string, selected: string[], setter: (rows: string[]) => void) => {
    setter(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/inventory/stock-entries" aria-label="Back to stock entries">
            <ArrowLeft size={20} />
          </Link>
        </Button>
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Create stock entry</h1>
          <p className="text-gray-600 mt-2">
            Adjustment entries apply to on-hand stock immediately (ledger + balances). Negative stock is
            blocked.
          </p>
        </div>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardPlus size={22} />
                Stock movement lines
              </CardTitle>
              <CardDescription>
                Search by SKU or name, then set direction and quantity for each line.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {lines.map((row, index) => (
                <div key={index} className="rounded-lg border bg-muted/30 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                    <div className="md:col-span-6">
                      <ItemSearchField
                        id={`stock-line-item-${index}`}
                        value={row.item}
                        onChange={(item) => updateLine(index, { item })}
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <span className="text-xs text-muted-foreground">Direction</span>
                      <Select
                        value={row.direction}
                        onValueChange={(v) => updateLine(index, { direction: v as 'in' | 'out' })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in">In (+)</SelectItem>
                          <SelectItem value="out">Out (−)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-3 space-y-1">
                      <span className="text-xs text-muted-foreground">Quantity</span>
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        value={row.quantity}
                        onChange={(e) => updateLine(index, { quantity: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    <div className="md:col-span-1 flex md:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeLine(index)}
                        disabled={lines.length <= 1}
                        className="md:mt-6"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              <Button type="button" variant="secondary" onClick={addLine}>
                Add line
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="xl:col-span-4 space-y-6">
          <Card className="xl:sticky xl:top-6">
            <CardHeader>
              <CardTitle>Entry details</CardTitle>
              <CardDescription>Choose reason and references before posting.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="created-by">Created by</Label>
                <Input id="created-by" value={createdBy || 'Loading…'} disabled readOnly />
              </div>

              <div className="grid gap-2">
                <Label>Reason</Label>
                <Select
                  value={reason}
                  onValueChange={(v) => {
                    setReason(v as Reason)
                    if (v !== 'purchase') setPurchaseInvoiceFile(null)
                    if (v !== 'other') setOtherDescription('')
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purchase">Purchase</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="material_issue">Material Issue</SelectItem>
                    <SelectItem value="material_deposit">Material Deposit</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Warehouse</Label>
                <Select value={warehouseId} onValueChange={setWarehouseId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {reason === 'purchase' ? (
                <div className="space-y-3 rounded-md border p-3 bg-muted/20">
                  <Label>Purchase orders (one or more)</Label>
                  <Input
                    value={poSearch}
                    onChange={(e) => setPoSearch(e.target.value)}
                    placeholder="Search PO number or supplier"
                  />
                  <div className="max-h-40 overflow-auto rounded border bg-background">
                    {filteredPurchaseOrders.length === 0 ? (
                      <p className="p-3 text-sm text-muted-foreground">No purchase orders found.</p>
                    ) : (
                      filteredPurchaseOrders.slice(0, 100).map((po) => (
                        <label key={po.id} className="flex items-center gap-2 p-2 border-b last:border-b-0 text-sm">
                          <input
                            type="checkbox"
                            checked={selectedPoIds.includes(po.id)}
                            onChange={() => toggleSelected(po.id, selectedPoIds, setSelectedPoIds)}
                          />
                          <span className="font-mono">{po.po_number}</span>
                          <span className="text-muted-foreground truncate">{po.supplier_name ?? '—'}</span>
                        </label>
                      ))
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="purchase-invoice">Upload purchase invoice</Label>
                    <Input
                      id="purchase-invoice"
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      onChange={(e) => setPurchaseInvoiceFile(e.target.files?.[0] ?? null)}
                    />
                  </div>
                </div>
              ) : null}

              {reason === 'sales' ? (
                <div className="space-y-3 rounded-md border p-3 bg-muted/20">
                  <Label>Sales invoices (one or more)</Label>
                  <Input
                    value={invoiceSearch}
                    onChange={(e) => setInvoiceSearch(e.target.value)}
                    placeholder="Search invoice number"
                  />
                  <div className="max-h-40 overflow-auto rounded border bg-background">
                    {filteredSalesInvoices.length === 0 ? (
                      <p className="p-3 text-sm text-muted-foreground">No sales invoices found.</p>
                    ) : (
                      filteredSalesInvoices.slice(0, 100).map((inv) => (
                        <label key={inv.id} className="flex items-center gap-2 p-2 border-b last:border-b-0 text-sm">
                          <input
                            type="checkbox"
                            checked={selectedSalesInvoiceIds.includes(inv.id)}
                            onChange={() =>
                              toggleSelected(inv.id, selectedSalesInvoiceIds, setSelectedSalesInvoiceIds)
                            }
                          />
                          <span className="font-mono">{inv.invoice_number}</span>
                          <span className="text-muted-foreground">{inv.status ?? '—'}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              ) : null}

              {reason === 'other' ? (
                <div className="grid gap-2">
                  <Label htmlFor="other-description">Description *</Label>
                  <Textarea
                    id="other-description"
                    value={otherDescription}
                    onChange={(e) => setOtherDescription(e.target.value)}
                    rows={3}
                    placeholder="Describe the reason for this stock movement"
                    required
                  />
                </div>
              ) : null}

              <div className="grid gap-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Additional context"
                />
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t">
                <Button type="submit" disabled={submitting || !createdBy}>
                  {submitting ? 'Posting…' : 'Post stock entry'}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/dashboard/inventory/stock-entries">Cancel</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  )
}
