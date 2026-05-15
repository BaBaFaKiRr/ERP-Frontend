'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { erpFetch } from '@/lib/erp-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type SalesInvoiceDetail = {
  id: string
  invoice_number: string
  status: 'active' | 'cancelled'
  generated_by_name?: string | null
  created_at: string
  sales_order_id: string
  dispatch_order_id: string
  sales_orders?: { order_number?: string | null; po_number?: string | null } | null
  dispatch_orders?: { do_number?: string | null } | null
  cancelled_at?: string | null
  cancellation_reason?: string | null
  cancelled_by_name?: string | null
}

type LinkedCreditNote = {
  id: string
  cn_number: string
  credit_note_date?: string | null
  rounded_total?: number | null
}

export default function SalesInvoiceDetailPage() {
  const params = useParams<{ id: string }>()
  const [row, setRow] = useState<SalesInvoiceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [canceling, setCanceling] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [me, setMe] = useState<{ role: string; firstName?: string | null; lastName?: string | null; email: string } | null>(null)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelAt, setCancelAt] = useState<string>('')
  const [creditNotes, setCreditNotes] = useState<LinkedCreditNote[]>([])

  const actorName = `${me?.firstName ?? ''} ${me?.lastName ?? ''}`.trim() || me?.email || 'Unknown User'

  const openPoPreview = async () => {
    if (!row?.sales_order_id || !row.sales_orders?.po_number) return
    try {
      const res = await erpFetch<{ data: { signed_url: string } }>(
        `/api/sales-orders/${row.sales_order_id}/purchase-order-url`,
      )
      if (res.data?.signed_url) window.open(res.data.signed_url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to open purchase order')
    }
  }

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await erpFetch<{ data: SalesInvoiceDetail }>(`/api/dispatch-sales-invoices/${params.id}`)
      setRow(res.data ?? null)

      const creditNotesRes = await erpFetch<{ data: LinkedCreditNote[] }>(
        `/api/credit-notes?dispatch_sales_invoice_id=${encodeURIComponent(params.id)}`,
      )
      setCreditNotes(creditNotesRes.data ?? [])

      const supabase = createClient()
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('Not authenticated')
      const baseUrl = process.env.NEXT_PUBLIC_ERP_API_URL?.replace(/\/$/, '')
      if (!baseUrl) throw new Error('NEXT_PUBLIC_ERP_API_URL is not set')
      const pdfRes = await fetch(`${baseUrl}/api/dispatch-sales-invoices/${params.id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!pdfRes.ok) throw new Error('Failed to fetch invoice PDF')
      const blob = await pdfRes.blob()
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
      setPdfUrl(URL.createObjectURL(blob))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sales invoice')
      setRow(null)
      setPdfUrl(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  useEffect(() => {
    void (async () => {
      try {
        const res = await erpFetch<{ user: { role: string; firstName?: string | null; lastName?: string | null; email: string } }>(
          '/api/me',
        )
        setMe(res.user ?? null)
      } catch {
        setMe(null)
      }
    })()
  }, [])

  const submitCancellation = async () => {
    if (!row || row.status === 'cancelled') return
    if (cancelReason.trim().length < 3) {
      alert('Please enter a reason for cancellation.')
      return
    }
    setCanceling(true)
    try {
      await erpFetch(`/api/dispatch-sales-invoices/${row.id}/cancel`, {
        method: 'POST',
        body: { reason: cancelReason.trim() },
      })
      setCancelDialogOpen(false)
      setCancelReason('')
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to cancel invoice')
    } finally {
      setCanceling(false)
    }
  }

  const regenerateInvoice = async () => {
    if (!row || row.status !== 'cancelled') return
    setRegenerating(true)
    window.location.href = `/dashboard/finance/sales-invoices/${row.id}/regenerate`
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <Button asChild variant="ghost" className="pl-0">
        <Link href="/dashboard/finance/sales-invoices">
          <ArrowLeft className="size-4 mr-2" /> Back to Sales Invoices
        </Link>
      </Button>

      {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {row ? (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle className="font-mono text-2xl">{row.invoice_number}</CardTitle>
                  <CardDescription>Sales Invoice Details</CardDescription>
                </div>
                {pdfUrl ? (
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                    title="Open PDF in new tab"
                    aria-label="Open PDF in new tab"
                  >
                    <ExternalLink className="size-4" />
                  </a>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <p>
                <span className="font-medium">Generated By:</span> {row.generated_by_name ?? '-'}
              </p>
              <p>
                <span className="font-medium">Generated On:</span> {new Date(row.created_at).toLocaleString('en-IN')}
              </p>
              <p>
                <span className="font-medium">Sales Order:</span>{' '}
                <Link className="hover:underline" href={`/dashboard/sales/${row.sales_order_id}`}>
                  {row.sales_orders?.order_number ?? '—'}
                </Link>
              </p>
              <p>
                <span className="font-medium">Dispatch Order:</span>{' '}
                <Link className="hover:underline" href={`/dashboard/finance/invoice-requests/${row.dispatch_order_id}`}>
                  {row.dispatch_orders?.do_number ?? '—'}
                </Link>
              </p>
              <p>
                <span className="font-medium">PO Number:</span>{' '}
                {row.sales_orders?.po_number ? (
                  <button type="button" className="text-blue-600 hover:underline" onClick={() => void openPoPreview()}>
                    {row.sales_orders.po_number}
                  </button>
                ) : '—'}
              </p>
              <p className="md:col-span-2">
                <span className="font-medium">Status:</span>{' '}
                <span className={row.status === 'active' ? 'text-green-600 text-3xl font-bold' : 'text-red-600 text-3xl font-bold'}>
                  {row.status === 'active' ? 'Active' : 'Cancelled'}
                </span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Credit Notes</CardTitle>
              <CardDescription>Credit notes issued against this sales invoice.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {creditNotes.length === 0 ? (
                <p className="text-muted-foreground">No credit notes linked to this invoice.</p>
              ) : (
                creditNotes.map((note) => (
                  <div key={note.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
                    <Link href={`/dashboard/finance/credit-notes/${note.id}`} className="font-mono font-medium hover:underline">
                      {note.cn_number}
                    </Link>
                    <span>{note.credit_note_date ? new Date(note.credit_note_date).toLocaleDateString('en-IN') : '—'}</span>
                    <span>₹{Number(note.rounded_total ?? 0).toFixed(2)}</span>
                  </div>
                ))
              )}
              <div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/dashboard/finance/credit-notes/new?dispatch_sales_invoice_id=${row.id}`}>Create Credit Note</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invoice Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[75vh] rounded-md border bg-muted/20 overflow-hidden">
                {pdfUrl ? (
                  <iframe title="Sales Invoice Preview" src={pdfUrl} className="w-full h-full border-0" />
                ) : (
                  <div className="h-full grid place-items-center">
                    <p className="text-sm text-muted-foreground">No preview available.</p>
                  </div>
                )}
              </div>
              <div className="flex justify-end pt-4">
                <div className="flex items-center gap-2">
                  {row.status === 'cancelled' ? (
                    <Button variant="outline" onClick={() => void regenerateInvoice()} disabled={regenerating || me?.role !== 'admin'}>
                      {regenerating ? 'Generating...' : 'Generate New Invoice'}
                    </Button>
                  ) : null}
                  {me?.role === 'admin' ? (
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setCancelAt(new Date().toLocaleString('en-IN'))
                        setCancelDialogOpen(true)
                      }}
                      disabled={row.status === 'cancelled' || canceling}
                    >
                      {row.status === 'cancelled' ? 'Invoice Cancelled' : canceling ? 'Cancelling...' : 'Cancel Invoice'}
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
          {row.status === 'cancelled' ? (
            <Card>
              <CardHeader>
                <CardTitle>Cancellation Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><span className="font-medium">Cancelled By:</span> {row.cancelled_by_name ?? '-'}</p>
                <p><span className="font-medium">Cancelled On:</span> {row.cancelled_at ? new Date(row.cancelled_at).toLocaleString('en-IN') : '-'}</p>
                <p><span className="font-medium">Reason:</span> {row.cancellation_reason ?? '-'}</p>
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Sales Invoice</DialogTitle>
            <DialogDescription>Provide cancellation details before confirming.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium">User cancelling the invoice:</span> {actorName}</p>
            <p><span className="font-medium">Current date and time:</span> {cancelAt}</p>
            <div>
              <p className="font-medium mb-1">Reason for cancellation</p>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Enter reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>Close</Button>
            <Button variant="destructive" onClick={() => void submitCancellation()} disabled={canceling || cancelReason.trim().length < 3}>
              {canceling ? 'Cancelling...' : 'Confirm Cancel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
