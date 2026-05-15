'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { erpFetch } from '@/lib/erp-api'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type CreditNoteDetail = {
  id: string
  cn_number: string
  credit_note_date?: string | null
  rounded_total?: number | null
  customer_debit_note_number?: string | null
  customer_debit_note_file_name?: string | null
  customers?: { name?: string | null } | null
  dispatch_sales_invoices?: { id?: string | null; invoice_number?: string | null } | null
  credit_note_lines?: Array<{
    sku?: string | null
    item_name?: string | null
    quantity?: number | null
    unit_price?: number | null
    line_total?: number | null
    return_received?: boolean | null
  }> | null
}

export default function CreditNoteDetailPage() {
  const params = useParams<{ id: string }>()
  const [data, setData] = useState<CreditNoteDetail | null>(null)
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
        const response = await fetch(`${baseUrl}/api/credit-notes/${params.id}/pdf`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (!response.ok) {
          const text = await response.text()
          throw new Error(text || 'Failed to load credit note preview')
        }
        const blob = await response.blob()
        if (!active) return
        setPreviewUrl(URL.createObjectURL(blob))
      } catch (e) {
        if (active) setPreviewError(e instanceof Error ? e.message : 'Failed to load credit note preview')
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
      const res = await erpFetch<{ data: CreditNoteDetail }>(`/api/credit-notes/${params.id}`)
      setData(res.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load credit note')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading credit note...</div>
  if (error) return <div className="p-8 text-sm text-red-600">{error}</div>
  if (!data) return <div className="p-8 text-sm text-muted-foreground">Credit note not found.</div>

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
          <h1 className="text-3xl font-bold">Credit Note</h1>
          <p className="text-sm text-muted-foreground">{data.cn_number}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Customer</p>
            <p className="font-medium">{data.customers?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Sales invoice</p>
            {data.dispatch_sales_invoices?.id ? (
              <Link
                href={`/dashboard/finance/sales-invoices/${data.dispatch_sales_invoices.id}`}
                className="font-medium hover:underline"
              >
                {data.dispatch_sales_invoices.invoice_number ?? data.dispatch_sales_invoices.id}
              </Link>
            ) : (
              <p className="font-medium">—</p>
            )}
          </div>
          <div>
            <p className="text-muted-foreground">Date</p>
            <p className="font-medium">
              {data.credit_note_date ? new Date(data.credit_note_date).toLocaleDateString('en-IN') : '—'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Rounded total</p>
            <p className="font-medium">₹{Number(data.rounded_total ?? 0).toFixed(2)}</p>
          </div>
          {data.customer_debit_note_number ? (
            <div>
              <p className="text-muted-foreground">Customer debit note number</p>
              <p className="font-medium">{data.customer_debit_note_number}</p>
            </div>
          ) : null}
          {data.customer_debit_note_file_name ? (
            <div>
              <p className="text-muted-foreground">Customer debit note file</p>
              <p className="font-medium">{data.customer_debit_note_file_name}</p>
            </div>
          ) : null}
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
                <TableHead>Return received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data.credit_note_lines ?? []).map((line, index) => (
                <TableRow key={`${line.sku ?? 'line'}-${index}`}>
                  <TableCell className="font-mono">{line.sku ?? '—'}</TableCell>
                  <TableCell>{line.item_name ?? '—'}</TableCell>
                  <TableCell className="text-right">{Number(line.quantity ?? 0)}</TableCell>
                  <TableCell className="text-right">₹{Number(line.unit_price ?? 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right">₹{Number(line.line_total ?? 0).toFixed(2)}</TableCell>
                  <TableCell>{line.return_received ? 'Yes' : 'No'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
            <iframe title="Credit Note Preview" src={previewUrl} className="h-[85vh] w-full rounded-md border" />
          ) : (
            <p className="text-sm text-muted-foreground">Generating credit note preview...</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
