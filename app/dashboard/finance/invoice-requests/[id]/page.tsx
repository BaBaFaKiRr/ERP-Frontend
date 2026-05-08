'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type DispatchOrderDetail = {
  id: string
  do_number?: string | null
  sales_order_id: string
  sales_order_number?: string | null
  sales_order_status?: string | null
  customer_name?: string | null
  status: string
  generated_by_name?: string | null
  rejected_by_name?: string | null
  created_at: string
  order_date?: string | null
  sales_orders?: {
    po_number?: string | null
  } | null
  dispatch_order_lines?: Array<{
    id: string
    item_id: string
    item_sku?: string | null
    item_name?: string | null
    qty_ordered?: number | null
    qty_shipped?: number | null
    qty_in_stock?: number | null
    qty_to_dispatch?: number | null
    unit_price?: number | null
  }> | null
}

type EditableLine = NonNullable<DispatchOrderDetail['dispatch_order_lines']>[number] & {
  picked: boolean
  unit_price_edit: string
}

type InvoiceSettingProfile = {
  id: string
  setting_type: 'terms' | 'bank' | 'company'
  alias: string
  is_default: boolean
}

type DispatchSalesInvoice = {
  id: string
  invoice_number: string
  status: 'active' | 'cancelled'
  created_at: string
}

function statusLabel(status: string): string {
  if (status === 'rejected_by_admin') return 'Rejected by Admin'
  if (status === 'waiting_to_dispatch') return 'Waiting To Dispatch'
  if (status === 'sent') return 'Sent'
  return status
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function invoiceFamilyKey(invoiceNumber: string): string {
  const m = invoiceNumber.match(/^(.*)-\d{3}$/)
  return m?.[1] ?? invoiceNumber
}

export default function InvoiceRequestDetailPage() {
  const params = useParams<{ id: string }>()
  const [data, setData] = useState<DispatchOrderDetail | null>(null)
  const [lines, setLines] = useState<EditableLine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [proformaOpen, setProformaOpen] = useState(false)
  const [proformaUrl, setProformaUrl] = useState<string | null>(null)
  const [proformaLoading, setProformaLoading] = useState(false)
  const [salesInvoiceOpen, setSalesInvoiceOpen] = useState(false)
  const [salesInvoiceUrl, setSalesInvoiceUrl] = useState<string | null>(null)
  const [salesInvoiceLoading, setSalesInvoiceLoading] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [profiles, setProfiles] = useState<InvoiceSettingProfile[]>([])
  const [termsProfileId, setTermsProfileId] = useState('')
  const [bankProfileId, setBankProfileId] = useState('')
  const [companyProfileId, setCompanyProfileId] = useState('')
  const [invoices, setInvoices] = useState<DispatchSalesInvoice[]>([])
  const [me, setMe] = useState<{ role: string } | null>(null)
  const [approvalBusy, setApprovalBusy] = useState(false)
  const [dispatchBusy, setDispatchBusy] = useState(false)
  const [expandedInvoiceFamilies, setExpandedInvoiceFamilies] = useState<Record<string, boolean>>({})

  const openPoPreview = async () => {
    if (!data?.sales_order_id || !data?.sales_orders?.po_number) return
    try {
      const res = await erpFetch<{ data: { signed_url: string } }>(
        `/api/sales-orders/${data.sales_order_id}/purchase-order-url`,
      )
      if (res.data?.signed_url) window.open(res.data.signed_url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to open purchase order')
    }
  }

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await erpFetch<{ data: DispatchOrderDetail }>(`/api/dispatch/orders/${params.id}`)
        setData(res.data ?? null)
        setLines(
          (res.data?.dispatch_order_lines ?? []).map((line) => ({
            ...line,
            picked: true,
            unit_price_edit: String(Number(line.unit_price ?? 0)),
          })),
        )
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load invoice request details')
      } finally {
        setLoading(false)
      }
    })()
  }, [params.id])

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

  const updateLine = (idx: number, patch: Partial<EditableLine>) =>
    setLines((prev) => prev.map((line, i) => (i === idx ? { ...line, ...patch } : line)))

  const selectedLines = lines.filter((line) => line.picked)
  const subTotal = selectedLines.reduce(
    (sum, line) => sum + Number(line.qty_to_dispatch ?? 0) * Number(line.unit_price_edit || 0),
    0,
  )
  const gstAmount = Math.round(subTotal * 0.18 * 100) / 100
  const grandTotal = Math.round((subTotal + gstAmount) * 100) / 100

  const openProformaPreview = async () => {
    if (!data?.sales_order_id) return
    setProformaLoading(true)
    try {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Not authenticated')
      const baseUrl = process.env.NEXT_PUBLIC_ERP_API_URL?.replace(/\/$/, '')
      if (!baseUrl) throw new Error('NEXT_PUBLIC_ERP_API_URL is not set')
      const res = await fetch(`${baseUrl}/api/dispatch/orders/${data.id}/proforma-pdf`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch proforma invoice')
      const blob = await res.blob()
      if (proformaUrl) URL.revokeObjectURL(proformaUrl)
      const nextUrl = URL.createObjectURL(blob)
      setProformaUrl(nextUrl)
      setProformaOpen(true)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to load proforma preview')
    } finally {
      setProformaLoading(false)
    }
  }

  const loadDispatchInvoices = async (dispatchOrderId: string) => {
    try {
      const res = await erpFetch<{ data: DispatchSalesInvoice[] }>(
        `/api/dispatch-sales-invoices?dispatch_order_id=${dispatchOrderId}`,
      )
      setInvoices(res.data ?? [])
    } catch {
      setInvoices([])
    }
  }

  useEffect(() => {
    if (!data?.id) return
    void loadDispatchInvoices(data.id)
  }, [data?.id])

  const generateSalesInvoice = async () => {
    if (selectedLines.length === 0) {
      alert('Select at least one item to generate sales invoice')
      return
    }
    if (!data?.id) return
    setSalesInvoiceLoading(true)
    try {
      const pre = await erpFetch<{ data: { can_generate: boolean; existing_invoice: { invoice_number: string } | null } }>(
        `/api/dispatch/orders/${data.id}/sales-invoice-precheck`,
      )
      if (!pre.data.can_generate) {
        alert(`An active sales invoice already exists: ${pre.data.existing_invoice?.invoice_number ?? ''}`)
        await loadDispatchInvoices(data.id)
        return
      }
      const settingsRes = await erpFetch<{ data: InvoiceSettingProfile[] }>('/api/invoice-settings')
      const all = settingsRes.data ?? []
      const terms = all.filter((p) => p.setting_type === 'terms')
      const banks = all.filter((p) => p.setting_type === 'bank')
      const companies = all.filter((p) => p.setting_type === 'company')
      if (!terms.length || !banks.length || !companies.length) {
        alert('Please create at least one profile in Accounts > Settings for Terms, Bank, and Company.')
        return
      }
      setProfiles(all)
      setTermsProfileId((terms.find((p) => p.is_default) ?? terms[0]).id)
      setBankProfileId((banks.find((p) => p.is_default) ?? banks[0]).id)
      setCompanyProfileId((companies.find((p) => p.is_default) ?? companies[0]).id)
      setSettingsOpen(true)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to run sales invoice pre-check')
    } finally {
      setSalesInvoiceLoading(false)
    }
  }

  const confirmGenerateSalesInvoice = async () => {
    if (!data?.id) return
    if (!termsProfileId || !bankProfileId || !companyProfileId) {
      alert('Please select Terms, Bank, and Company profiles.')
      return
    }
    setSalesInvoiceLoading(true)
    try {
      const createRes = await erpFetch<{ data: { id: string; invoice_number: string } }>(
        '/api/dispatch-sales-invoices',
        {
          method: 'POST',
          body: {
            dispatch_order_id: data.id,
            terms_profile_id: termsProfileId,
            bank_profile_id: bankProfileId,
            company_profile_id: companyProfileId,
            lines: selectedLines.map((line) => ({
              dispatch_order_line_id: line.id,
              unit_price: Number(line.unit_price_edit || 0),
            })),
          },
        },
      )
      setSettingsOpen(false)

      const supabase = createClient()
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('Not authenticated')
      const baseUrl = process.env.NEXT_PUBLIC_ERP_API_URL?.replace(/\/$/, '')
      if (!baseUrl) throw new Error('NEXT_PUBLIC_ERP_API_URL is not set')
      const pdfRes = await fetch(`${baseUrl}/api/dispatch-sales-invoices/${createRes.data.id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!pdfRes.ok) throw new Error('Failed to render generated sales invoice PDF')
      const blob = await pdfRes.blob()
      if (salesInvoiceUrl) URL.revokeObjectURL(salesInvoiceUrl)
      const nextUrl = URL.createObjectURL(blob)
      setSalesInvoiceUrl(nextUrl)
      setSalesInvoiceOpen(true)
      await loadDispatchInvoices(data.id)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to generate sales invoice')
    } finally {
      setSalesInvoiceLoading(false)
    }
  }

  const approveDispatchOrder = async () => {
    if (!data?.id) return
    const yes = confirm('Approve this dispatch order?')
    if (!yes) return
    setApprovalBusy(true)
    try {
      await erpFetch(`/api/dispatch/orders/${data.id}/approve`, { method: 'POST', body: {} })
      const refreshed = await erpFetch<{ data: DispatchOrderDetail }>(`/api/dispatch/orders/${data.id}`)
      setData(refreshed.data ?? null)
      await loadDispatchInvoices(data.id)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to approve dispatch order')
    } finally {
      setApprovalBusy(false)
    }
  }

  const rejectDispatchOrder = async () => {
    if (!data?.id) return
    const yes = confirm('Reject this dispatch order? Active invoice for this dispatch order will be cancelled.')
    if (!yes) return
    setApprovalBusy(true)
    try {
      await erpFetch(`/api/dispatch/orders/${data.id}/reject`, { method: 'POST', body: {} })
      const refreshed = await erpFetch<{ data: DispatchOrderDetail }>(`/api/dispatch/orders/${data.id}`)
      setData(refreshed.data ?? null)
      await loadDispatchInvoices(data.id)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to reject dispatch order')
    } finally {
      setApprovalBusy(false)
    }
  }

  const dispatchOrderNow = async () => {
    if (!data?.id) return
    const yes = confirm('Dispatch this order now? This will debit stock and mark status as Sent.')
    if (!yes) return
    setDispatchBusy(true)
    try {
      await erpFetch(`/api/dispatch/orders/${data.id}/dispatch`, { method: 'POST', body: {} })
      const refreshed = await erpFetch<{ data: DispatchOrderDetail }>(`/api/dispatch/orders/${data.id}`)
      setData(refreshed.data ?? null)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to dispatch order')
    } finally {
      setDispatchBusy(false)
    }
  }

  const invoiceGroups = (() => {
    const families = new Map<string, DispatchSalesInvoice[]>()
    for (const row of invoices) {
      const key = invoiceFamilyKey(row.invoice_number)
      const existing = families.get(key) ?? []
      existing.push(row)
      families.set(key, existing)
    }
    return Array.from(families.entries())
      .map(([key, rows]) => ({
        key,
        rows: rows
          .slice()
          .sort((a, b) => a.invoice_number.localeCompare(b.invoice_number, undefined, { numeric: true })),
      }))
      .sort(
        (a, b) =>
          new Date(b.rows[0]?.created_at ?? 0).getTime() - new Date(a.rows[0]?.created_at ?? 0).getTime(),
      )
  })()

  return (
    <div className="p-6 md:p-8 space-y-6">
      <Button asChild variant="ghost" className="pl-0">
        <Link href="/dashboard/finance/invoice-requests">
          <ArrowLeft className="size-4 mr-2" /> Back to Invoice Requests
        </Link>
      </Button>

      {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {data ? (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <CardTitle>Invoice Request Details</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => void openProformaPreview()} disabled={proformaLoading}>
                    {proformaLoading ? 'Loading Proforma...' : 'Get Proforma Invoice'}
                  </Button>
                  <Button
                    onClick={() => void generateSalesInvoice()}
                    disabled={selectedLines.length === 0 || salesInvoiceLoading}
                  >
                    {salesInvoiceLoading ? 'Generating...' : 'Generate Sales Invoice'}
                  </Button>
                  {me?.role === 'admin' && data.status === 'awaiting_approval' ? (
                    <>
                      <Button onClick={() => void approveDispatchOrder()} disabled={approvalBusy}>
                        {approvalBusy ? 'Working...' : 'Approve'}
                      </Button>
                      <Button variant="destructive" onClick={() => void rejectDispatchOrder()} disabled={approvalBusy}>
                        {approvalBusy ? 'Working...' : 'Reject'}
                      </Button>
                    </>
                  ) : null}
                  {(me?.role === 'admin' || me?.role === 'store') && data.status === 'waiting_to_dispatch' ? (
                    <Button onClick={() => void dispatchOrderNow()} disabled={dispatchBusy}>
                      {dispatchBusy ? 'Dispatching...' : 'Dispatch Order'}
                    </Button>
                  ) : null}
                  {(me?.role === 'admin' || me?.role === 'store') && data.status === 'awaiting_invoice' ? (
                    <Button variant="outline" disabled title="Generate and approve a new sales invoice before dispatching">
                      Dispatch Disabled - Generate New Invoice
                    </Button>
                  ) : null}
                </div>
              </div>
              <CardDescription>{data.do_number ?? '—'}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <p><span className="font-medium">Dispatch Order:</span> {data.do_number ?? '—'}</p>
              <p><span className="font-medium">Status:</span> {statusLabel(data.status)}</p>
              <p>
                <span className="font-medium">Sales Order:</span>{' '}
                <Link className="hover:underline" href={`/dashboard/sales/${data.sales_order_id}`}>
                  {data.sales_order_number ?? '—'}
                </Link>
              </p>
              <p><span className="font-medium">Sales Order Status:</span> {statusLabel(String(data.sales_order_status ?? ''))}</p>
              <p><span className="font-medium">Customer:</span> {data.customer_name ?? '-'}</p>
              <p><span className="font-medium">Generated By:</span> {data.generated_by_name ?? '-'}</p>
              {data.rejected_by_name ? <p><span className="font-medium">Rejected By:</span> {data.rejected_by_name}</p> : null}
              <p><span className="font-medium">Generated On:</span> {new Date(data.created_at).toLocaleString('en-IN')}</p>
              <p><span className="font-medium">SO Order Date:</span> {data.order_date ? new Date(data.order_date).toLocaleDateString('en-IN') : '-'}</p>
              <p>
                <span className="font-medium">PO Number:</span>{' '}
                {data.sales_orders?.po_number ? (
                  <button type="button" className="text-blue-600 hover:underline" onClick={() => void openPoPreview()}>
                    {data.sales_orders.po_number}
                  </button>
                ) : '-'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Generated Sales Invoices</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {invoices.length === 0 ? <p className="text-sm text-muted-foreground">No sales invoices generated yet.</p> : null}
              {invoiceGroups.map((group) => {
                const isFamily = group.rows.length > 1
                const expanded = Boolean(expandedInvoiceFamilies[group.key])
                const first = group.rows[0]
                return (
                  <div key={group.key} className="rounded-md border">
                    <button
                      type="button"
                      disabled={!isFamily}
                      onClick={() =>
                        isFamily
                          ? setExpandedInvoiceFamilies((prev) => ({ ...prev, [group.key]: !prev[group.key] }))
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
                        <span className="font-mono">{isFamily ? `${group.key}-...` : first.invoice_number}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">{group.rows.length} item(s)</span>
                    </button>

                    <div className="space-y-2 border-t p-2">
                      {(isFamily && expanded ? group.rows : [first]).map((inv) => (
                        <div key={inv.id} className="rounded border p-3 flex items-center justify-between">
                          <div>
                            <Link href={`/dashboard/finance/sales-invoices/${inv.id}`} className="font-mono hover:underline">
                              {inv.invoice_number}
                            </Link>
                            <p className={inv.status === 'active' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                              {inv.status === 'active' ? 'Active' : 'Cancelled'}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            onClick={async () => {
                              try {
                                const supabase = createClient()
                                const { data: sessionData } = await supabase.auth.getSession()
                                const token = sessionData.session?.access_token
                                if (!token) throw new Error('Not authenticated')
                                const baseUrl = process.env.NEXT_PUBLIC_ERP_API_URL?.replace(/\/$/, '')
                                if (!baseUrl) throw new Error('NEXT_PUBLIC_ERP_API_URL is not set')
                                const res = await fetch(`${baseUrl}/api/dispatch-sales-invoices/${inv.id}/pdf`, {
                                  headers: { Authorization: `Bearer ${token}` },
                                })
                                if (!res.ok) throw new Error('Failed to fetch sales invoice PDF')
                                const blob = await res.blob()
                                if (salesInvoiceUrl) URL.revokeObjectURL(salesInvoiceUrl)
                                const nextUrl = URL.createObjectURL(blob)
                                setSalesInvoiceUrl(nextUrl)
                                setSalesInvoiceOpen(true)
                              } catch (e) {
                                alert(e instanceof Error ? e.message : 'Failed to open sales invoice')
                              }
                            }}
                          >
                            Preview PDF
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Selected Dispatch Items</CardTitle>
              <CardDescription>All item details from the generated dispatch order.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-3">Pick</th>
                    <th className="py-2 pr-3">Item</th>
                    <th className="py-2 pr-3">Qty Ordered</th>
                    <th className="py-2 pr-3">Qty Shipped</th>
                    <th className="py-2 pr-3">Qty in Stock</th>
                    <th className="py-2 pr-3">Qty to Dispatch</th>
                    <th className="py-2 pr-3">Unit Price</th>
                    <th className="py-2 pr-3">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, idx) => (
                    <tr key={line.id} className="border-b">
                      <td className="py-2 pr-3">
                        <Checkbox checked={line.picked} onCheckedChange={(v) => updateLine(idx, { picked: Boolean(v) })} />
                      </td>
                      <td className="py-2 pr-3">{line.item_sku ?? '—'} - {line.item_name ?? 'Item'}</td>
                      <td className="py-2 pr-3">{Number(line.qty_ordered ?? 0)}</td>
                      <td className="py-2 pr-3">{Number(line.qty_shipped ?? 0)}</td>
                      <td className="py-2 pr-3">{Number(line.qty_in_stock ?? 0)}</td>
                      <td className="py-2 pr-3">{Number(line.qty_to_dispatch ?? 0)}</td>
                      <td className="py-2 pr-3 w-40">
                        <Input
                          type="number"
                          min="0"
                          value={line.unit_price_edit}
                          onChange={(e) => updateLine(idx, { unit_price_edit: e.target.value })}
                        />
                      </td>
                      <td className="py-2 pr-3">
                        ₹{(Number(line.qty_to_dispatch ?? 0) * Number(line.unit_price_edit || 0)).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {lines.length > 0 ? (
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
            </CardContent>
          </Card>

          <Dialog open={proformaOpen} onOpenChange={setProformaOpen}>
            <DialogContent className="w-[95vw] max-w-[1200px] h-[90vh] p-0 gap-0 overflow-hidden">
              <DialogHeader>
                <div className="flex items-center justify-between px-6 py-4 border-b">
                  <DialogTitle>Proforma Invoice Preview</DialogTitle>
                  {proformaUrl ? (
                    <a
                      href={proformaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mr-8 inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="Open in new tab"
                      aria-label="Open in new tab"
                    >
                      <ExternalLink className="size-4" />
                    </a>
                  ) : null}
                </div>
              </DialogHeader>
              <div className="h-[calc(90vh-64px)] bg-muted/20">
                {proformaUrl ? (
                  <iframe title="Proforma Invoice" src={proformaUrl} className="w-full h-full border-0" />
                ) : (
                  <div className="h-full grid place-items-center">
                    <p className="text-sm text-muted-foreground">No preview available.</p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={salesInvoiceOpen} onOpenChange={setSalesInvoiceOpen}>
            <DialogContent className="w-[95vw] max-w-[1200px] h-[90vh] p-0 gap-0 overflow-hidden">
              <DialogHeader>
                <div className="flex items-center justify-between px-6 py-4 border-b">
                  <DialogTitle>Sales Invoice Preview</DialogTitle>
                  {salesInvoiceUrl ? (
                    <a
                      href={salesInvoiceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mr-8 inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="Open in new tab"
                      aria-label="Open in new tab"
                    >
                      <ExternalLink className="size-4" />
                    </a>
                  ) : null}
                </div>
              </DialogHeader>
              <div className="h-[calc(90vh-64px)] bg-muted/20">
                {salesInvoiceUrl ? (
                  <iframe title="Sales Invoice" src={salesInvoiceUrl} className="w-full h-full border-0" />
                ) : (
                  <div className="h-full grid place-items-center">
                    <p className="text-sm text-muted-foreground">No preview available.</p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Select Invoice Settings Profiles</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
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
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setSettingsOpen(false)}>Cancel</Button>
                  <Button onClick={() => void confirmGenerateSalesInvoice()} disabled={salesInvoiceLoading}>
                    {salesInvoiceLoading ? 'Generating...' : 'Generate Invoice'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </>
      ) : null}
    </div>
  )
}
