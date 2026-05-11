'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type ReceiptDetail = {
  id: string
  pr_number: string
  seller_sales_invoice_number?: string | null
  status: string
  payment_status?: string | null
  total_amount?: number | null
  received_at?: string | null
  uploaded_by_name?: string | null
  uploaded_at?: string | null
  suppliers?: { id: string; name?: string | null; supplier_code?: string | null } | null
  purchase_orders?: { id: string; po_number?: string | null } | null
  purchase_receipt_lines?: Array<{
    id: string
    quantity?: number | null
    items?: { sku?: string | null; name?: string | null } | null
  }> | null
}

type PreviewTab = 'receipt' | 'purchase-order'

export default function PurchaseReceiptDetailPage() {
  const params = useParams<{ id: string }>()
  const [data, setData] = useState<ReceiptDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null)
  const [receiptPreviewError, setReceiptPreviewError] = useState<string | null>(null)
  const [poPreviewUrl, setPoPreviewUrl] = useState<string | null>(null)
  const [poPreviewError, setPoPreviewError] = useState<string | null>(null)
  const [activePreview, setActivePreview] = useState<PreviewTab>('receipt')

  useEffect(() => {
    void load()
  }, [params.id])

  useEffect(() => {
    if (!params.id) return
    let active = true
    setReceiptPreviewUrl(null)
    setReceiptPreviewError(null)
    void (async () => {
      try {
        const res = await erpFetch<{ data: { signed_url: string } }>(`/api/purchase/receipts/${params.id}/seller-sales-invoice-url`)
        if (active) setReceiptPreviewUrl(res.data.signed_url)
      } catch (e) {
        if (active) setReceiptPreviewError(e instanceof Error ? e.message : 'Failed to load seller sales invoice preview')
      }
    })()
    return () => {
      active = false
    }
  }, [params.id])

  useEffect(() => {
    const purchaseOrderId = data?.purchase_orders?.id
    if (!purchaseOrderId) {
      setPoPreviewUrl(null)
      setPoPreviewError(null)
      setActivePreview('receipt')
      return
    }

    let active = true
    let objectUrl: string | null = null
    setPoPreviewUrl(null)
    setPoPreviewError(null)
    void (async () => {
      try {
        const supabase = createClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session?.access_token) throw new Error('Not authenticated')
        const baseUrl = process.env.NEXT_PUBLIC_ERP_API_URL?.replace(/\/$/, '')
        if (!baseUrl) throw new Error('NEXT_PUBLIC_ERP_API_URL is not set')
        const response = await fetch(`${baseUrl}/api/purchase/orders/${purchaseOrderId}/pdf`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (!response.ok) {
          const message = await response.text()
          throw new Error(message || 'Failed to load purchase order preview')
        }
        const blob = await response.blob()
        objectUrl = URL.createObjectURL(blob)
        if (active) setPoPreviewUrl(objectUrl)
      } catch (e) {
        if (active) setPoPreviewError(e instanceof Error ? e.message : 'Failed to load purchase order preview')
      }
    })()
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [data?.purchase_orders?.id])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await erpFetch<{ data: ReceiptDetail }>(`/api/purchase/receipts/${params.id}`)
      setData(res.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load purchase receipt details')
    } finally {
      setLoading(false)
    }
  }

  const supplierLabel = useMemo(() => {
    if (!data?.suppliers) return '—'
    const code = data.suppliers.supplier_code?.trim()
    return `${code ? `${code} - ` : ''}${data.suppliers.name ?? ''}`
  }, [data?.suppliers])

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading purchase receipt...</div>
  if (error) return <div className="p-8 text-sm text-red-600">{error}</div>
  if (!data) return <div className="p-8 text-sm text-muted-foreground">Receipt not found.</div>

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/purchase/receipts">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft size={16} />
            Back
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Purchase Receipt Details</h1>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{data.pr_number}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">System PR Number</p>
                <p className="font-medium">{data.pr_number}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Seller Sales Invoice Number</p>
                <p className="font-medium">{data.seller_sales_invoice_number ?? '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="font-medium">{data.status}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Payment Status</p>
                <p className="font-medium">{data.payment_status ?? 'UNPAID'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Amount</p>
                <p className="font-medium">{data.total_amount != null ? `₹${Number(data.total_amount).toFixed(2)}` : '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Supplier</p>
                {data.suppliers?.id ? (
                  <Link href={`/dashboard/purchase/suppliers/${data.suppliers.id}`} className="font-medium hover:underline">
                    {supplierLabel}
                  </Link>
                ) : (
                  <p className="font-medium">{supplierLabel}</p>
                )}
              </div>
              <div>
                <p className="text-muted-foreground">Purchase Order</p>
                {data.purchase_orders?.id ? (
                  <Link href={`/dashboard/purchase/orders/${data.purchase_orders.id}`} className="font-medium text-white hover:underline">
                    {data.purchase_orders.po_number ?? data.purchase_orders.id}
                  </Link>
                ) : (
                  <p className="font-medium">—</p>
                )}
              </div>
              <div>
                <p className="text-muted-foreground">Uploaded By</p>
                <p className="font-medium">{data.uploaded_by_name ?? '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Uploaded At</p>
                <p className="font-medium">{data.uploaded_at ? new Date(data.uploaded_at).toLocaleString('en-IN') : '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Received At</p>
                <p className="font-medium">{data.received_at ? new Date(data.received_at).toLocaleDateString('en-GB') : '—'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent>
              {(data.purchase_receipt_lines ?? []).length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qty Entered</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data.purchase_receipt_lines ?? []).map((line) => (
                      <TableRow key={line.id}>
                        <TableCell className="font-mono">{line.items?.sku ?? '-'}</TableCell>
                        <TableCell>{line.items?.name ?? '-'}</TableCell>
                        <TableCell className="text-right">{Number(line.quantity ?? 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">No items found for this purchase receipt.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="xl:sticky xl:top-6 h-fit">
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {data.purchase_orders?.id ? (
              <Tabs value={activePreview} onValueChange={(value) => setActivePreview(value as PreviewTab)} className="gap-4">
                <TabsList>
                  <TabsTrigger value="receipt">Seller Sales Invoice</TabsTrigger>
                  <TabsTrigger value="purchase-order">Purchase Order</TabsTrigger>
                </TabsList>
                <TabsContent value="receipt">
                  <PreviewFrame
                    title="Seller Sales Invoice Preview"
                    url={receiptPreviewUrl}
                    error={receiptPreviewError}
                    loadingText="Loading seller sales invoice preview..."
                    emptyText="No seller sales invoice preview available."
                  />
                </TabsContent>
                <TabsContent value="purchase-order">
                  <PreviewFrame
                    title="Purchase Order Preview"
                    url={poPreviewUrl}
                    error={poPreviewError}
                    loadingText="Generating purchase order preview..."
                    emptyText="No purchase order preview available."
                  />
                </TabsContent>
              </Tabs>
            ) : (
              <PreviewFrame
                title="Seller Sales Invoice Preview"
                url={receiptPreviewUrl}
                error={receiptPreviewError}
                loadingText="Loading seller sales invoice preview..."
                emptyText="No seller sales invoice preview available."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function PreviewFrame({
  title,
  url,
  error,
  loadingText,
  emptyText,
}: {
  title: string
  url: string | null
  error: string | null
  loadingText: string
  emptyText: string
}) {
  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (url) return <iframe title={title} src={url} className="h-[85vh] w-full rounded-md border" />
  return <p className="text-sm text-muted-foreground">{loadingText || emptyText}</p>
}
