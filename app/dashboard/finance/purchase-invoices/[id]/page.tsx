'use client'

import { useEffect, useMemo, useState } from 'react'
import { EntityActivityLog } from '@/components/entity-activity-log'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type PurchaseInvoiceLine = {
  id: string
  quantity?: number | null
  unit_price?: number | null
  line_total?: number | null
  items?: { sku?: string | null; name?: string | null } | null
}

type SupplierDetails = {
  id?: string | null
  name?: string | null
  supplier_code?: string | null
  supplier_type?: 'domestic' | 'international' | null
  gst_number?: string | null
  gst_name?: string | null
  gst_address?: string | null
  pan?: string | null
  supplier_country?: string | null
  tax_identification_number?: string | null
  bank_name_on_account?: string | null
  bank_name?: string | null
  bank_branch?: string | null
  bank_account_number?: string | null
  ifsc_code?: string | null
}

type PurchaseInvoiceDetail = {
  id: string
  pi_number: string
  status: string
  total_amount?: number | null
  notes?: string | null
  created_at?: string | null
  suppliers?: SupplierDetails | null
  purchase_orders?: { id?: string | null; po_number?: string | null } | null
  created_by_user?: { first_name?: string | null; last_name?: string | null; email?: string | null } | null
  purchase_invoice_lines?: PurchaseInvoiceLine[] | null
  purchase_invoice_receipts?: Array<{
    purchase_receipts?: {
      id: string
      pr_number?: string | null
    } | null
  }> | null
}

function DataRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value?.trim() ? value : '—'}</p>
    </div>
  )
}

export default function PurchaseInvoiceDetailPage() {
  const params = useParams<{ id: string }>()
  const [data, setData] = useState<PurchaseInvoiceDetail | null>(null)
  const [debitNotes, setDebitNotes] = useState<Array<{ id: string; dn_number: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void load()
  }, [params.id])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await erpFetch<{ data: PurchaseInvoiceDetail }>(`/api/purchase/invoices/${params.id}`)
      setData(res.data)
      const debitRes = await erpFetch<{ data: Array<{ id: string; dn_number: string }> }>(
        `/api/debit-notes?purchase_invoice_id=${params.id}`,
      )
      setDebitNotes(debitRes.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load purchase invoice')
    } finally {
      setLoading(false)
    }
  }

  const receipts = useMemo(
    () => (data?.purchase_invoice_receipts ?? []).map((row) => row.purchase_receipts).filter(Boolean) as NonNullable<
      NonNullable<PurchaseInvoiceDetail['purchase_invoice_receipts']>[number]['purchase_receipts']
    >[],
    [data],
  )

  const invoiceLines = data?.purchase_invoice_lines ?? []

  const subTotal = useMemo(
    () => invoiceLines.reduce((sum, line) => sum + Number(line.line_total ?? 0), 0),
    [invoiceLines],
  )
  const gstAmount = Math.round(subTotal * 0.18 * 100) / 100
  const grandTotal = Math.round((subTotal + gstAmount) * 100) / 100

  const supplier = data?.suppliers ?? null

  const supplierLabel = useMemo(() => {
    if (!supplier) return '—'
    const code = supplier.supplier_code?.trim()
    return `${code ? `${code} - ` : ''}${supplier.name ?? ''}`
  }, [supplier])

  const supplierTypeLabel = useMemo(() => {
    if (!supplier?.supplier_type) return '—'
    return `${supplier.supplier_type[0].toUpperCase()}${supplier.supplier_type.slice(1)}`
  }, [supplier?.supplier_type])

  const createdByLabel = useMemo(() => {
    const user = data?.created_by_user
    if (!user) return '—'
    const name = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()
    return name || user.email || '—'
  }, [data?.created_by_user])

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading purchase invoice...</div>
  if (error) return <div className="p-8 text-sm text-red-600">{error}</div>
  if (!data) return <div className="p-8 text-sm text-muted-foreground">Purchase invoice not found.</div>

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/finance/purchase-invoices">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft size={16} />
              Back
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Purchase Invoice Details</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/dashboard/finance/debit-notes/new?purchase_invoice_id=${data.id}`}>
            <Button variant="outline">Issue Debit Note</Button>
          </Link>
          {data.status !== 'paid' && data.status !== 'cancelled' ? (
            <Link href={`/dashboard/finance/purchase-invoices/${data.id}/record-payment`}>
              <Button>Record Payment</Button>
            </Link>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{data.pi_number}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Status</p>
            <p className="font-medium">{data.status}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Supplier</p>
            <p className="font-medium">{supplierLabel}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Purchase order</p>
            {data.purchase_orders?.id ? (
              <Link href={`/dashboard/purchase/orders/${data.purchase_orders.id}`} className="font-medium hover:underline">
                {data.purchase_orders.po_number ?? data.purchase_orders.id}
              </Link>
            ) : (
              <p className="font-medium">—</p>
            )}
          </div>
          <div>
            <p className="text-muted-foreground">Created by</p>
            <p className="font-medium">{createdByLabel}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Created at</p>
            <p className="font-medium">{data.created_at ? new Date(data.created_at).toLocaleString('en-IN') : '—'}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-muted-foreground">Notes</p>
            <p className="font-medium whitespace-pre-wrap">{data.notes?.trim() ? data.notes : '—'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Supplier Details</CardTitle>
          <CardDescription>Bank and tax details for the linked supplier.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="mb-1 text-sm font-medium">{supplierLabel}</p>
            {supplier?.id ? (
              <Link href={`/dashboard/purchase/suppliers/${supplier.id}`} className="text-sm hover:underline">
                View supplier profile
              </Link>
            ) : null}
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Tax Details</p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <DataRow label="Supplier Type" value={supplierTypeLabel === '—' ? undefined : supplierTypeLabel} />
              <DataRow label="GST Number" value={supplier?.gst_number} />
              <DataRow label="Name on GST" value={supplier?.gst_name} />
              <DataRow label="GST Address" value={supplier?.gst_address} />
              <DataRow label="PAN" value={supplier?.pan} />
              <DataRow label="Supplier Country" value={supplier?.supplier_country} />
              <DataRow label="Tax Identification Number" value={supplier?.tax_identification_number} />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Bank Details</p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <DataRow label="Name on Account" value={supplier?.bank_name_on_account} />
              <DataRow label="Bank Name" value={supplier?.bank_name} />
              <DataRow label="Bank Branch" value={supplier?.bank_branch} />
              <DataRow label="Account Number" value={supplier?.bank_account_number} />
              <DataRow label="IFSC Code" value={supplier?.ifsc_code} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          {invoiceLines.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoiceLines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="font-mono">{line.items?.sku ?? '—'}</TableCell>
                    <TableCell>{line.items?.name ?? '—'}</TableCell>
                    <TableCell className="text-right">{Number(line.quantity ?? 0)}</TableCell>
                    <TableCell className="text-right">₹{Number(line.unit_price ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right">₹{Number(line.line_total ?? 0).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/30 font-medium">
                  <TableCell colSpan={4} className="text-right">
                    Sub Total
                  </TableCell>
                  <TableCell className="text-right">₹{subTotal.toFixed(2)}</TableCell>
                </TableRow>
                <TableRow className="bg-muted/20 font-medium">
                  <TableCell colSpan={4} className="text-right">
                    GST (18%)
                  </TableCell>
                  <TableCell className="text-right">₹{gstAmount.toFixed(2)}</TableCell>
                </TableRow>
                <TableRow className="bg-muted/30 font-semibold">
                  <TableCell colSpan={4} className="text-right">
                    Total amount
                  </TableCell>
                  <TableCell className="text-right">₹{grandTotal.toFixed(2)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No items found for this purchase invoice.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Linked Purchase Receipts</CardTitle>
        </CardHeader>
        <CardContent>
          {receipts.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {receipts.map((receipt) => (
                <Link
                  key={receipt.id}
                  href={`/dashboard/purchase/receipts/${receipt.id}`}
                  className="font-mono text-sm font-medium hover:underline"
                >
                  {receipt.pr_number ?? receipt.id}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No linked purchase receipts.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Linked Debit Notes</CardTitle>
        </CardHeader>
        <CardContent>
          {debitNotes.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {debitNotes.map((note) => (
                <Link
                  key={note.id}
                  href={`/dashboard/finance/debit-notes/${note.id}`}
                  className="font-mono text-sm font-medium hover:underline"
                >
                  {note.dn_number}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No linked debit notes.</p>
          )}
        </CardContent>
      </Card>

      <EntityActivityLog entityType="purchase_invoice" entityId={data?.id} />
    </div>
  )
}
