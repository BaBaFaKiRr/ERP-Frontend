'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type SalesInvoice = {
  id: string
  invoice_number: string
  status?: string | null
  customer_id?: string | null
  customers?: { id?: string | null; name?: string | null } | null
  dispatch_orders?: { customer_name?: string | null } | null
  dispatch_sales_invoice_lines?: Array<{
    item_id: string
    item_sku?: string | null
    item_name?: string | null
    quantity?: number | null
    unit_price?: number | null
  }> | null
}

type MeUser = {
  firstName?: string | null
  lastName?: string | null
  email?: string | null
}

type InvoiceLine = NonNullable<SalesInvoice['dispatch_sales_invoice_lines']>[number]

type DraftLine = {
  id: string
  item_id: string
  sku: string
  item_name: string
  quantity: string
  unit_price: string
  return_received: boolean
}

function toLocalYmd(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function CreateCreditNotePage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading create credit note form...</div>}>
      <CreateCreditNoteContent />
    </Suspense>
  )
}

function CreateCreditNoteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>([])
  const [siSearch, setSiSearch] = useState('')
  const [selectedSalesInvoiceId, setSelectedSalesInvoiceId] = useState('')
  const [selectedSalesInvoice, setSelectedSalesInvoice] = useState<SalesInvoice | null>(null)
  const [entityLabel, setEntityLabel] = useState('—')
  const [creditNoteDate] = useState(toLocalYmd(new Date()))
  const [itemSearch, setItemSearch] = useState('')
  const [lines, setLines] = useState<DraftLine[]>([])
  const [hasCustomerDebitNote, setHasCustomerDebitNote] = useState(false)
  const [customerDebitNoteNumber, setCustomerDebitNoteNumber] = useState('')
  const [customerDebitNoteFile, setCustomerDebitNoteFile] = useState<File | null>(null)
  const [createdByLabel, setCreatedByLabel] = useState('—')
  const [createdAtLabel, setCreatedAtLabel] = useState('—')

  useEffect(() => {
    void initialize()
  }, [])

  const filteredSalesInvoices = useMemo(() => {
    const term = siSearch.trim().toLowerCase()
    const eligible = salesInvoices.filter((invoice) => invoice.status !== 'cancelled')
    if (!term) return eligible
    return eligible.filter((invoice) => {
      const customer = `${invoice.customers?.name ?? ''} ${invoice.dispatch_orders?.customer_name ?? ''}`.toLowerCase()
      return invoice.invoice_number.toLowerCase().includes(term) || customer.includes(term)
    })
  }, [salesInvoices, siSearch])

  const availableInvoiceLines = useMemo(() => {
    if (!selectedSalesInvoice) return []
    const addedItemIds = new Set(lines.map((line) => line.item_id))
    const term = itemSearch.trim().toLowerCase()
    return (selectedSalesInvoice.dispatch_sales_invoice_lines ?? []).filter((line) => {
      if (addedItemIds.has(line.item_id)) return false
      if (!term) return true
      const label = `${line.item_sku ?? ''} ${line.item_name ?? ''}`.toLowerCase()
      return label.includes(term)
    })
  }, [selectedSalesInvoice, lines, itemSearch])

  const initialize = async () => {
    setLoading(true)
    setError(null)
    try {
      const [invoicesRes, meRes] = await Promise.all([
        erpFetch<{ data: SalesInvoice[] }>('/api/dispatch-sales-invoices'),
        erpFetch<{ user: MeUser }>('/api/me'),
      ])
      setSalesInvoices(invoicesRes.data ?? [])
      const user = meRes.user
      const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
      setCreatedByLabel(name || user.email || '—')
      setCreatedAtLabel(new Date().toLocaleString('en-IN'))

      const salesInvoiceId = searchParams.get('dispatch_sales_invoice_id')
      if (salesInvoiceId) {
        await chooseSalesInvoiceById(salesInvoiceId)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load credit note form')
    } finally {
      setLoading(false)
    }
  }

  const chooseSalesInvoiceById = async (id: string) => {
    const res = await erpFetch<{ data: SalesInvoice }>(`/api/dispatch-sales-invoices/${id}`)
    applySalesInvoiceSelection(res.data)
  }

  const chooseSalesInvoice = async (invoice: SalesInvoice) => {
    if (!(invoice.dispatch_sales_invoice_lines ?? []).length) {
      await chooseSalesInvoiceById(invoice.id)
      return
    }
    applySalesInvoiceSelection(invoice)
  }

  const applySalesInvoiceSelection = (invoice: SalesInvoice) => {
    setSelectedSalesInvoiceId(invoice.id)
    setSelectedSalesInvoice(invoice)
    setSiSearch(invoice.invoice_number)
    setEntityLabel(invoice.customers?.name ?? invoice.dispatch_orders?.customer_name ?? '—')
    setLines([])
    setItemSearch('')
  }

  const addLineFromInvoice = (invoiceLine: InvoiceLine) => {
    if (lines.some((line) => line.item_id === invoiceLine.item_id)) return
    setLines((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        item_id: invoiceLine.item_id,
        sku: invoiceLine.item_sku ?? '',
        item_name: invoiceLine.item_name ?? '',
        quantity: String(invoiceLine.quantity ?? ''),
        unit_price: String(invoiceLine.unit_price ?? ''),
        return_received: false,
      },
    ])
    setItemSearch('')
  }

  const removeLine = (id: string) => {
    setLines((current) => current.filter((line) => line.id !== id))
  }

  const updateLine = (id: string, patch: Partial<DraftLine>) => {
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...patch } : line)))
  }

  const save = async () => {
    if (!selectedSalesInvoiceId) {
      setError('Choose a sales invoice.')
      return
    }
    const payloadLines = lines
      .map((line) => ({
        item_id: line.item_id,
        sku: line.sku,
        item_name: line.item_name,
        quantity: Number(line.quantity),
        unit_price: Number(line.unit_price),
        return_received: line.return_received,
      }))
      .filter((line) => Number.isFinite(line.quantity) && line.quantity > 0)
    if (payloadLines.length === 0) {
      setError('Add at least one line with quantity greater than 0.')
      return
    }
    if (hasCustomerDebitNote && !customerDebitNoteNumber.trim()) {
      setError('Enter the customer debit note number.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('dispatch_sales_invoice_id', selectedSalesInvoiceId)
      if (hasCustomerDebitNote) {
        formData.append('has_customer_debit_note', 'true')
        formData.append('customer_debit_note_number', customerDebitNoteNumber.trim())
        if (customerDebitNoteFile) formData.append('customer_debit_note_file', customerDebitNoteFile)
      }
      formData.append('lines', JSON.stringify(payloadLines))

      const res = await erpFetch<{ data: { id: string } }>('/api/credit-notes', { method: 'POST', body: formData })
      router.push(`/dashboard/finance/credit-notes/${res.data.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create credit note')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading create credit note form...</div>

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/finance/credit-notes">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft size={16} />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Create Credit Note</h1>
          <p className="text-sm text-muted-foreground">Issue a credit note against a sales invoice.</p>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Credit Note</CardTitle>
          <CardDescription>Date, created by, and created at are captured when you save.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Sales Invoice</Label>
            <Input
              placeholder="Search sales invoice..."
              value={siSearch}
              onChange={(e) => {
                setSiSearch(e.target.value)
                if (selectedSalesInvoiceId) {
                  setSelectedSalesInvoiceId('')
                  setSelectedSalesInvoice(null)
                  setEntityLabel('—')
                  setLines([])
                }
              }}
            />
            <div className="max-h-40 space-y-1 overflow-auto rounded-md border p-2">
              {filteredSalesInvoices.map((invoice) => (
                <button
                  key={invoice.id}
                  type="button"
                  className={`block w-full rounded px-2 py-1 text-left text-sm hover:bg-muted ${selectedSalesInvoiceId === invoice.id ? 'bg-muted font-medium' : ''}`}
                  onClick={() => void chooseSalesInvoice(invoice)}
                >
                  {invoice.invoice_number} · {invoice.customers?.name ?? invoice.dispatch_orders?.customer_name ?? '—'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Entity</Label>
              <Input value={entityLabel} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input value={creditNoteDate} readOnly />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Items</Label>
            <Input
              placeholder={selectedSalesInvoice ? 'Search items from sales invoice...' : 'Choose a sales invoice first'}
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              disabled={!selectedSalesInvoice}
            />
            {selectedSalesInvoice ? (
              <div className="max-h-40 space-y-1 overflow-auto rounded-md border p-2">
                {availableInvoiceLines.length === 0 ? (
                  <p className="px-2 py-1 text-sm text-muted-foreground">
                    {itemSearch.trim() ? 'No matching items on this invoice.' : 'All invoice items are already added.'}
                  </p>
                ) : (
                  availableInvoiceLines.map((invoiceLine) => (
                    <button
                      key={invoiceLine.item_id}
                      type="button"
                      className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-muted"
                      onClick={() => addLineFromInvoice(invoiceLine)}
                    >
                      {invoiceLine.item_sku ? `${invoiceLine.item_sku} · ` : ''}
                      {invoiceLine.item_name ?? invoiceLine.item_id}
                    </button>
                  ))
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Choose a sales invoice, then search and add items.</p>
            )}
            {lines.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items added yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead>Item return received</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell className="font-mono">{line.sku || '—'}</TableCell>
                      <TableCell>{line.item_name}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          className="ml-auto max-w-24 text-right"
                          type="number"
                          min="0"
                          step="0.001"
                          value={line.quantity}
                          onChange={(e) => updateLine(line.id, { quantity: e.target.value })}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          className="ml-auto max-w-28 text-right"
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.unit_price}
                          onChange={(e) => updateLine(line.id, { unit_price: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={line.return_received}
                            onCheckedChange={(checked) => updateLine(line.id, { return_received: checked === true })}
                          />
                          <span className="text-sm">Item return received</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(line.id)} aria-label="Remove item">
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="space-y-3 rounded-md border p-4">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={hasCustomerDebitNote}
                onCheckedChange={(checked) => {
                  setHasCustomerDebitNote(checked === true)
                  if (checked !== true) {
                    setCustomerDebitNoteNumber('')
                    setCustomerDebitNoteFile(null)
                  }
                }}
              />
              <Label>Add customer&apos;s Debit Note</Label>
            </div>
            {hasCustomerDebitNote ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="customer-dn-number">Debit Note Number</Label>
                  <Input
                    id="customer-dn-number"
                    value={customerDebitNoteNumber}
                    onChange={(e) => setCustomerDebitNoteNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-dn-file">Debit Note Upload</Label>
                  <Input
                    id="customer-dn-file"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    onChange={(e) => setCustomerDebitNoteFile(e.target.files?.[0] ?? null)}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Created by</Label>
              <Input value={createdByLabel} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Created at</Label>
              <Input value={createdAtLabel} readOnly />
            </div>
          </div>

          <Button onClick={() => void save()} disabled={saving}>
            {saving ? 'Creating...' : 'Create Credit Note'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
