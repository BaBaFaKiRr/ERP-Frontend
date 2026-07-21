'use client'

import { useEffect, useState } from 'react'
import { EntityActivityLog } from '@/components/entity-activity-log'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { erpFetch } from '@/lib/erp-api'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type DebitNoteDetail = {
  id: string
  dn_number: string
  debit_note_date?: string | null
  rounded_total?: number | null
  suppliers?: { name?: string | null; supplier_code?: string | null } | null
  purchase_orders?: { id?: string | null; po_number?: string | null } | null
  debit_note_lines?: Array<{
    sku?: string | null
    item_name?: string | null
    quantity?: number | null
    unit_price?: number | null
    line_total?: number | null
    return_item?: boolean | null
  }> | null
  debit_note_purchase_receipts?: Array<{ purchase_receipts?: { id: string; pr_number?: string | null } | null }> | null
  debit_note_purchase_invoices?: Array<{ purchase_invoices?: { id: string; pi_number?: string | null } | null }> | null
}

export default function DebitNoteDetailPage() {
  const params = useParams<{ id: string }>()
  const [data, setData] = useState<DebitNoteDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)

  useEffect(() => {
    void load()
  }, [params.id])

  useEffect(() => {
    if (!params.id) return
    let active = true
  void (async () => {
      try {
        const supabase = createClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session?.access_token) throw new Error('Not authenticated')
        const baseUrl = process.env.NEXT_PUBLIC_ERP_API_URL?.replace(/\/$/, '')
        if (!baseUrl) throw new Error('NEXT_PUBLIC_ERP_API_URL is not set')
        const response = await fetch(`${baseUrl}/api/debit-notes/${params.id}/pdf`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (!response.ok) {
          const text = await response.text()
          throw new Error(text || 'Failed to load debit note preview')
        }
        const blob = await response.blob()
        if (!active) return
        setPreviewUrl(URL.createObjectURL(blob))
      } catch (e) {
        if (active) setPreviewError(e instanceof Error ? e.message : 'Failed to load debit note preview')
      }
    })()
    return () => {
      active = false
    }
  }, [params.id])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await erpFetch<{ data: DebitNoteDetail }>(`/api/debit-notes/${params.id}`)
      setData(res.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load debit note')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading debit note...</div>
  if (error) return <div className="p-8 text-sm text-red-600">{error}</div>
  if (!data) return <div className="p-8 text-sm text-muted-foreground">Debit note not found.</div>

  const receipts = (data.debit_note_purchase_receipts ?? []).map((row) => row.purchase_receipts).filter(Boolean)
  const invoices = (data.debit_note_purchase_invoices ?? []).map((row) => row.purchase_invoices).filter(Boolean)

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
          <h1 className="text-3xl font-bold">Debit Note</h1>
          <p className="text-sm text-muted-foreground">{data.dn_number}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Supplier</p>
            <p className="font-medium">
              {data.suppliers?.supplier_code ? `${data.suppliers.supplier_code} - ` : ''}
              {data.suppliers?.name ?? '—'}
            </p>
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
            <p className="text-muted-foreground">Date</p>
            <p className="font-medium">{data.debit_note_date ? new Date(data.debit_note_date).toLocaleDateString('en-IN') : '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Rounded total</p>
            <p className="font-medium">₹{Number(data.rounded_total ?? 0).toFixed(2)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Return</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data.debit_note_lines ?? []).map((line, index) => (
                <TableRow key={`${line.sku ?? 'line'}-${index}`}>
                  <TableCell className="font-mono">{line.sku ?? '—'}</TableCell>
                  <TableCell>{line.item_name ?? '—'}</TableCell>
                  <TableCell className="text-right">{Number(line.quantity ?? 0)}</TableCell>
                  <TableCell className="text-right">₹{Number(line.unit_price ?? 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right">₹{Number(line.line_total ?? 0).toFixed(2)}</TableCell>
                  <TableCell>{line.return_item ? 'Yes' : 'No'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Linked Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="text-muted-foreground">Purchase receipts</p>
            <div className="mt-2 flex flex-wrap gap-3">
              {receipts.length > 0 ? (
                receipts.map((receipt) => (
                  <Link key={receipt!.id} href={`/dashboard/purchase/receipts/${receipt!.id}`} className="font-mono hover:underline">
                    {receipt!.pr_number ?? receipt!.id}
                  </Link>
                ))
              ) : (
                <p>—</p>
              )}
            </div>
          </div>
          <div>
            <p className="text-muted-foreground">Purchase invoices</p>
            <div className="mt-2 flex flex-wrap gap-3">
              {invoices.length > 0 ? (
                invoices.map((invoice) => (
                  <Link key={invoice!.id} href={`/dashboard/finance/purchase-invoices/${invoice!.id}`} className="font-mono hover:underline">
                    {invoice!.pi_number ?? invoice!.id}
                  </Link>
                ))
              ) : (
                <p>—</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
        </CardHeader>
        <CardContent>
          {previewError ? (
            <p className="text-sm text-red-600">{previewError}</p>
          ) : previewUrl ? (
            <iframe title="Debit Note Preview" src={previewUrl} className="h-[85vh] w-full rounded-md border" />
          ) : (
            <p className="text-sm text-muted-foreground">Generating debit note preview...</p>
          )}
        </CardContent>
      </Card>

      <EntityActivityLog entityType="debit_note" entityId={data?.id} />
    </div>
  )
}
