'use client'

import { useEffect, useMemo, useState } from 'react'
import { EntityActivityLog } from '@/components/entity-activity-log'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type PurchaseOrderDetail = {
  id: string
  po_number?: string | null
  status: 'draft' | 'generated' | 'goods_received' | 'closed' | string
  purchase_employee_name?: string | null
  created_at: string
  expected_delivery_date?: string | null
  total_amount?: number | null
  notes?: string | null
  terms_text?: string | null
  suppliers?: { id?: string; name?: string | null; supplier_code?: string | null } | null
  purchase_order_lines?: Array<{
    id: string
    item_id?: string | null
    quantity?: number | null
    unit_price?: number | null
    line_total?: number | null
    items?: { sku?: string | null; name?: string | null } | null
  }> | null
  purchase_receipts?: Array<{
    id: string
    pr_number?: string | null
    seller_sales_invoice_number?: string | null
    status?: string | null
    total_amount?: number | null
    received_at?: string | null
    uploaded_at?: string | null
    purchase_receipt_lines?: Array<{
      item_id?: string | null
      quantity?: number | null
    }> | null
  }> | null
}

export default function PurchaseOrderDetailPage() {
  const params = useParams<{ id: string }>()
  const [data, setData] = useState<PurchaseOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [debitNotes, setDebitNotes] = useState<Array<{ id: string; dn_number: string }>>([])

  useEffect(() => {
    if (!params.id) return
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await erpFetch<{ data: PurchaseOrderDetail }>(`/api/purchase/orders/${params.id}`)
        setData(res.data)
        const debitRes = await erpFetch<{ data: Array<{ id: string; dn_number: string }> }>(
          `/api/debit-notes?purchase_order_id=${params.id}`,
        )
        setDebitNotes(debitRes.data ?? [])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load purchase order')
      } finally {
        setLoading(false)
      }
    })()
  }, [params.id])

  useEffect(() => {
    if (!params.id) return
    let active = true
    let objectUrl: string | null = null
    void (async () => {
      setPreviewError(null)
      try {
        const supabase = createClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session?.access_token) throw new Error('Not authenticated')
        const baseUrl = process.env.NEXT_PUBLIC_ERP_API_URL?.replace(/\/$/, '')
        if (!baseUrl) throw new Error('NEXT_PUBLIC_ERP_API_URL is not set')
        const response = await fetch(`${baseUrl}/api/purchase/orders/${params.id}/pdf`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (!response.ok) {
          const message = await response.text()
          throw new Error(message || 'Failed to load purchase order preview')
        }
        const blob = await response.blob()
        objectUrl = URL.createObjectURL(blob)
        if (active) setPreviewUrl(objectUrl)
      } catch (e) {
        if (active) setPreviewError(e instanceof Error ? e.message : 'Failed to load purchase order preview')
      }
    })()
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [params.id])

  const subTotal = useMemo(() => {
    return (data?.purchase_order_lines ?? []).reduce((sum, line) => {
      const qty = Number(line.quantity ?? 0)
      const price = Number(line.unit_price ?? 0)
      return sum + qty * price
    }, 0)
  }, [data?.purchase_order_lines])

  const tax = Math.round(subTotal * 0.18 * 100) / 100
  const grandTotal = Math.round((subTotal + tax) * 100) / 100

  const receivedQtyByItem = useMemo(() => {
    const quantities = new Map<string, number>()
    for (const receipt of data?.purchase_receipts ?? []) {
      if (receipt.status === 'cancelled') continue
      for (const line of receipt.purchase_receipt_lines ?? []) {
        const itemId = line.item_id ?? ''
        if (!itemId) continue
        quantities.set(itemId, (quantities.get(itemId) ?? 0) + Number(line.quantity ?? 0))
      }
    }
    return quantities
  }, [data?.purchase_receipts])

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading purchase order...</div>
  if (error || !data) return <div className="p-8 text-sm text-red-600">{error ?? 'Purchase order not found'}</div>

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/purchase/orders">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft size={16} />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Purchase Order {data.po_number ?? '(Draft)'}</h1>
            <p className="text-sm text-muted-foreground">Status: {data.status.replace(/_/g, ' ')}</p>
          </div>
        </div>
        {data.status === 'draft' && (
          <Link href={`/dashboard/purchase/create?draftId=${data.id}`}>
            <Button variant="outline">Edit Draft</Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Supplier</p>
                {data.suppliers?.id ? (
                  <Link href={`/dashboard/purchase/suppliers/${data.suppliers.id}`} className="font-medium text-blue-600 hover:underline">
                    {(data.suppliers.supplier_code?.trim() ? `${data.suppliers.supplier_code} - ` : '') + (data.suppliers.name ?? '-')}
                  </Link>
                ) : (
                  <p className="font-medium">
                    {(data.suppliers?.supplier_code?.trim() ? `${data.suppliers.supplier_code} - ` : '') + (data.suppliers?.name ?? '-')}
                  </p>
                )}
              </div>
              <div>
                <p className="text-muted-foreground">Created By</p>
                <p className="font-medium">{data.purchase_employee_name ?? '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Created At</p>
                <p className="font-medium">{new Date(data.created_at).toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Expected Delivery Date</p>
                <p className="font-medium">{data.expected_delivery_date ?? '-'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty Ordered</TableHead>
                    <TableHead className="text-right">Qty Received</TableHead>
                    <TableHead className="text-right">Qty Pending</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Line Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data.purchase_order_lines ?? []).map((line) => {
                    const orderedQty = Number(line.quantity ?? 0)
                    const receivedQty = receivedQtyByItem.get(line.item_id ?? '') ?? 0
                    const pendingQty = Math.max(orderedQty - receivedQty, 0)
                    return (
                      <TableRow key={line.id}>
                        <TableCell className="font-mono">{line.items?.sku ?? '-'}</TableCell>
                        <TableCell>{line.items?.name ?? '-'}</TableCell>
                        <TableCell className="text-right">{orderedQty}</TableCell>
                        <TableCell className="text-right">{receivedQty}</TableCell>
                        <TableCell className="text-right">{pendingQty}</TableCell>
                        <TableCell className="text-right">₹{Number(line.unit_price ?? 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right">₹{(orderedQty * Number(line.unit_price ?? 0)).toFixed(2)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              <div className="mt-4 text-right text-sm space-y-1">
                <p>Subtotal: ₹{subTotal.toFixed(2)}</p>
                <p>Tax (18%): ₹{tax.toFixed(2)}</p>
                <p className="font-semibold text-base">Grand Total: ₹{grandTotal.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Purchase Receipts</CardTitle>
            </CardHeader>
            <CardContent>
              {(data.purchase_receipts ?? []).length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PR Number</TableHead>
                      <TableHead>Seller Invoice</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Received At</TableHead>
                      <TableHead className="text-right">Items</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data.purchase_receipts ?? []).map((receipt) => (
                      <TableRow key={receipt.id}>
                        <TableCell>
                          <Link href={`/dashboard/purchase/receipts/${receipt.id}`} className="font-mono hover:underline">
                            {receipt.pr_number ?? receipt.id}
                          </Link>
                        </TableCell>
                        <TableCell>{receipt.seller_sales_invoice_number ?? '-'}</TableCell>
                        <TableCell>{receipt.status ?? '-'}</TableCell>
                        <TableCell>
                          {receipt.received_at
                            ? new Date(receipt.received_at).toLocaleDateString('en-GB')
                            : receipt.uploaded_at
                              ? new Date(receipt.uploaded_at).toLocaleString('en-IN')
                              : '-'}
                        </TableCell>
                        <TableCell className="text-right">{receipt.purchase_receipt_lines?.length ?? 0}</TableCell>
                        <TableCell className="text-right">
                          {receipt.total_amount != null ? `₹${Number(receipt.total_amount).toFixed(2)}` : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">No purchase receipts created against this purchase order yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Terms and Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Terms & Conditions</p>
                <div className="text-sm whitespace-pre-wrap rounded-md border p-3">{data.terms_text?.trim() ? data.terms_text : '-'}</div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Notes</p>
                <div className="text-sm whitespace-pre-wrap rounded-md border p-3">{data.notes?.trim() ? data.notes : '-'}</div>
              </div>
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
        </div>

        <div className="xl:sticky xl:top-6 h-fit">
          <Card>
            <CardHeader>
              <CardTitle>PO Preview</CardTitle>
            </CardHeader>
            <CardContent>
              {previewError ? (
                <p className="text-sm text-red-600">{previewError}</p>
              ) : previewUrl ? (
                <iframe title="Purchase Order Preview" src={previewUrl} className="h-[85vh] w-full rounded-md border" />
              ) : (
                <p className="text-sm text-muted-foreground">Generating preview...</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <EntityActivityLog entityType="purchase_order" entityId={data?.id} />
    </div>
  )
}
