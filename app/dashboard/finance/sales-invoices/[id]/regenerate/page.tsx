'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type InvoiceSettingProfile = {
  id: string
  setting_type: 'terms' | 'bank' | 'company'
  alias: string
  is_default: boolean
}

type SalesOrderLine = {
  item_id: string
  item_sku?: string | null
  item_name?: string | null
  qty_ordered: number
  qty_shipped: number
  qty_in_stock: number
  unit_price: number
}

type EditableRow = SalesOrderLine & {
  picked: boolean
  qty_to_ship: string
  unit_price_edit: string
}

type CancelledInvoice = {
  id: string
  invoice_number: string
  status: 'active' | 'cancelled'
  sales_order_id: string
  sales_orders?: { order_number?: string | null } | null
}

export default function RegenerateSalesInvoicePage() {
  const params = useParams<{ id: string }>()
  const [invoice, setInvoice] = useState<CancelledInvoice | null>(null)
  const [rows, setRows] = useState<EditableRow[]>([])
  const [profiles, setProfiles] = useState<InvoiceSettingProfile[]>([])
  const [termsProfileId, setTermsProfileId] = useState('')
  const [bankProfileId, setBankProfileId] = useState('')
  const [companyProfileId, setCompanyProfileId] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const invoiceRes = await erpFetch<{ data: CancelledInvoice }>(`/api/dispatch-sales-invoices/${params.id}`)
        const inv = invoiceRes.data
        setInvoice(inv)
        if (!inv || inv.status !== 'cancelled') {
          setError('Only cancelled invoices can be regenerated.')
          return
        }

        const [salesOrderRes, settingsRes] = await Promise.all([
          erpFetch<{ data: { lines: SalesOrderLine[] } }>(`/api/dispatch/sales-orders/${inv.sales_order_id}`),
          erpFetch<{ data: InvoiceSettingProfile[] }>('/api/invoice-settings'),
        ])

        setRows(
          (salesOrderRes.data?.lines ?? []).map((line) => ({
            ...line,
            picked: false,
            qty_to_ship: '',
            unit_price_edit: String(Number(line.unit_price ?? 0)),
          })),
        )

        const allProfiles = settingsRes.data ?? []
        setProfiles(allProfiles)
        const terms = allProfiles.filter((p) => p.setting_type === 'terms')
        const banks = allProfiles.filter((p) => p.setting_type === 'bank')
        const companies = allProfiles.filter((p) => p.setting_type === 'company')
        setTermsProfileId((terms.find((p) => p.is_default) ?? terms[0])?.id ?? '')
        setBankProfileId((banks.find((p) => p.is_default) ?? banks[0])?.id ?? '')
        setCompanyProfileId((companies.find((p) => p.is_default) ?? companies[0])?.id ?? '')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load regeneration data')
      } finally {
        setLoading(false)
      }
    })()
  }, [params.id])

  const updateRow = (idx: number, patch: Partial<EditableRow>) =>
    setRows((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)))

  const selectedRows = useMemo(() => rows.filter((row) => row.picked && Number(row.qty_to_ship || 0) > 0), [rows])
  const subTotal = selectedRows.reduce(
    (sum, row) => sum + Number(row.qty_to_ship || 0) * Number(row.unit_price_edit || 0),
    0,
  )
  const gstAmount = Math.round(subTotal * 0.18 * 100) / 100
  const grandTotal = Math.round((subTotal + gstAmount) * 100) / 100

  const generateInvoice = async () => {
    if (!invoice) return
    if (selectedRows.length === 0) {
      alert('Pick at least one item and enter qty to ship.')
      return
    }
    if (!termsProfileId || !bankProfileId || !companyProfileId) {
      alert('Select Terms, Bank, and Company profiles.')
      return
    }
    for (const row of rows) {
      if (!row.picked) continue
      const qty = Number(row.qty_to_ship || 0)
      if (!(qty > 0)) {
        alert(`Qty to ship must be greater than 0 for ${row.item_sku ?? row.item_id}`)
        return
      }
      if (qty > Number(row.qty_ordered ?? 0) + 0.0005) {
        alert(`Qty to ship exceeds ordered quantity for ${row.item_sku ?? row.item_id}`)
        return
      }
      if (qty > Number(row.qty_in_stock ?? 0) + 0.0005) {
        alert(`Qty to ship exceeds stock for ${row.item_sku ?? row.item_id}`)
        return
      }
    }

    setSubmitting(true)
    try {
      const res = await erpFetch<{ data: { id: string } }>(`/api/dispatch-sales-invoices/${invoice.id}/regenerate`, {
        method: 'POST',
        body: {
          terms_profile_id: termsProfileId,
          bank_profile_id: bankProfileId,
          company_profile_id: companyProfileId,
          lines: selectedRows.map((row) => ({
            item_id: row.item_id,
            quantity: Number(row.qty_to_ship || 0),
            unit_price: Number(row.unit_price_edit || 0),
          })),
        },
      })
      window.location.href = `/dashboard/finance/sales-invoices/${res.data.id}`
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to regenerate invoice')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <Button asChild variant="ghost" className="pl-0">
        <Link href={`/dashboard/finance/sales-invoices/${params.id}`}>
          <ArrowLeft className="size-4 mr-2" /> Back to Cancelled Invoice
        </Link>
      </Button>

      {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!loading && !error && invoice ? (
        <Card>
          <CardHeader>
            <CardTitle>Regenerate Sales Invoice</CardTitle>
            <CardDescription>
              Base Invoice: {invoice.invoice_number} · Sales Order: {invoice.sales_orders?.order_number ?? '—'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-3">Pick</th>
                    <th className="py-2 pr-3">Item</th>
                    <th className="py-2 pr-3">Total Qty (SO)</th>
                    <th className="py-2 pr-3">Qty Shipped</th>
                    <th className="py-2 pr-3">Qty in Stock</th>
                    <th className="py-2 pr-3">Qty to Ship</th>
                    <th className="py-2 pr-3">Price</th>
                    <th className="py-2 pr-3">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={row.item_id} className="border-b">
                      <td className="py-2 pr-3">
                        <Checkbox checked={row.picked} onCheckedChange={(v) => updateRow(idx, { picked: Boolean(v) })} />
                      </td>
                      <td className="py-2 pr-3">{row.item_sku ?? '—'} - {row.item_name ?? 'Item'}</td>
                      <td className="py-2 pr-3">{Number(row.qty_ordered ?? 0)}</td>
                      <td className="py-2 pr-3">{Number(row.qty_shipped ?? 0)}</td>
                      <td className="py-2 pr-3">{Number(row.qty_in_stock ?? 0)}</td>
                      <td className="py-2 pr-3 w-36">
                        <Input
                          type="number"
                          min="0"
                          disabled={!row.picked}
                          value={row.qty_to_ship}
                          onChange={(e) => updateRow(idx, { qty_to_ship: e.target.value })}
                        />
                      </td>
                      <td className="py-2 pr-3 w-36">
                        <Input
                          type="number"
                          min="0"
                          disabled={!row.picked}
                          value={row.unit_price_edit}
                          onChange={(e) => updateRow(idx, { unit_price_edit: e.target.value })}
                        />
                      </td>
                      <td className="py-2 pr-3">
                        ₹{(Number(row.qty_to_ship || 0) * Number(row.unit_price_edit || 0)).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {rows.length > 0 ? (
                    <>
                      <tr className="bg-muted/30 font-medium">
                        <td colSpan={7} className="py-2 pr-3 text-right">Sub Total</td>
                        <td className="py-2 pr-3">₹{subTotal.toFixed(2)}</td>
                      </tr>
                      <tr className="bg-muted/20 font-medium">
                        <td colSpan={7} className="py-2 pr-3 text-right">GST (18%)</td>
                        <td className="py-2 pr-3">₹{gstAmount.toFixed(2)}</td>
                      </tr>
                      <tr className="bg-muted/30 font-semibold">
                        <td colSpan={7} className="py-2 pr-3 text-right">Grand Total</td>
                        <td className="py-2 pr-3">₹{grandTotal.toFixed(2)}</td>
                      </tr>
                    </>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium mb-1">Terms & Conditions</p>
                <Select value={termsProfileId} onValueChange={setTermsProfileId}>
                  <SelectTrigger><SelectValue placeholder="Select Terms profile" /></SelectTrigger>
                  <SelectContent>
                    {profiles.filter((p) => p.setting_type === 'terms').map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.alias}{p.is_default ? ' (Default)' : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Bank Details</p>
                <Select value={bankProfileId} onValueChange={setBankProfileId}>
                  <SelectTrigger><SelectValue placeholder="Select Bank profile" /></SelectTrigger>
                  <SelectContent>
                    {profiles.filter((p) => p.setting_type === 'bank').map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.alias}{p.is_default ? ' (Default)' : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Company Details</p>
                <Select value={companyProfileId} onValueChange={setCompanyProfileId}>
                  <SelectTrigger><SelectValue placeholder="Select Company profile" /></SelectTrigger>
                  <SelectContent>
                    {profiles.filter((p) => p.setting_type === 'company').map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.alias}{p.is_default ? ' (Default)' : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => void generateInvoice()} disabled={submitting || selectedRows.length === 0}>
                {submitting ? 'Generating...' : 'Generate Invoice'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
