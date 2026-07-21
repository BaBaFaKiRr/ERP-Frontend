'use client'

import { useEffect, useMemo, useState } from 'react'
import { EntityActivityLog } from '@/components/entity-activity-log'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type JournalEntryDetail = {
  id: string
  journal_entry_number?: string | null
  direction?: 'received' | 'made' | null
  entity_type?: 'supplier' | 'customer' | 'employee' | 'other' | null
  transaction_date?: string | null
  amount?: number | null
  description?: string | null
  other_name?: string | null
  other_company?: string | null
  other_designation?: string | null
  other_phone_number?: string | null
  other_note?: string | null
  link_category?: string | null
  payment_receipt_file_name?: string | null
  sales_invoice_file_name?: string | null
  payment_receipt_signed_url?: string | null
  sales_invoice_signed_url?: string | null
  suppliers?: { id?: string | null; name?: string | null; supplier_code?: string | null } | null
  customers?: { id?: string | null; name?: string | null } | null
  employees?: { id?: string | null; full_name?: string | null; employee_code?: string | null } | null
  purchase_orders?: { id?: string | null; po_number?: string | null } | null
  purchase_receipts?: { id?: string | null; pr_number?: string | null } | null
  purchase_invoices?: { id?: string | null; pi_number?: string | null } | null
  dispatch_sales_invoices?: { id?: string | null; invoice_number?: string | null } | null
  sales_orders?: { id?: string | null; order_number?: string | null } | null
  created_by_user?: { first_name?: string | null; last_name?: string | null; email?: string | null } | null
  created_at?: string | null
}

const LINK_CATEGORY_LABELS: Record<string, string> = {
  purchase: 'Purchase',
  sale: 'Sale',
  maintenance: 'Maintenance',
  hr: 'HR',
  business_event: 'Business Event',
  miscellaneous: 'Miscellaneous',
}

function directionLabel(direction?: string | null): string {
  if (direction === 'received') return 'Payment received'
  if (direction === 'made') return 'Payment made'
  return '—'
}

function entityTypeLabel(entityType?: string | null): string {
  if (!entityType) return '—'
  return entityType.charAt(0).toUpperCase() + entityType.slice(1)
}

export default function JournalEntryDetailPage() {
  const params = useParams<{ id: string }>()
  const [data, setData] = useState<JournalEntryDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void load()
  }, [params.id])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await erpFetch<{ data: JournalEntryDetail }>(`/api/journal-entries/${params.id}`)
      setData(res.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load journal entry')
    } finally {
      setLoading(false)
    }
  }

  const entityLabel = useMemo(() => {
    if (!data) return '—'
    if (data.suppliers?.name) {
      const code = data.suppliers.supplier_code?.trim()
      return `${code ? `${code} - ` : ''}${data.suppliers.name}`
    }
    if (data.customers?.name) return data.customers.name
    if (data.employees?.full_name) {
      const code = data.employees.employee_code?.trim()
      return `${code ? `${code} - ` : ''}${data.employees.full_name}`
    }
    return data.other_name?.trim() || '—'
  }, [data])

  const createdByLabel = useMemo(() => {
    const user = data?.created_by_user
    if (!user) return '—'
    const name = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()
    return name || user.email || '—'
  }, [data?.created_by_user])

  const linkLabel = useMemo(() => {
    if (!data?.link_category) return '—'
    const category = LINK_CATEGORY_LABELS[data.link_category] ?? data.link_category
    if (data.purchase_orders?.po_number) return `${category} · PO ${data.purchase_orders.po_number}`
    if (data.purchase_receipts?.pr_number) return `${category} · PR ${data.purchase_receipts.pr_number}`
    if (data.purchase_invoices?.pi_number) return `${category} · PI ${data.purchase_invoices.pi_number}`
    if (data.dispatch_sales_invoices?.invoice_number) {
      return `${category} · Sales Invoice ${data.dispatch_sales_invoices.invoice_number}`
    }
    if (data.sales_orders?.order_number) return `${category} · Proforma ${data.sales_orders.order_number}`
    return category
  }, [data])

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading journal entry...</div>
  if (error) return <div className="p-8 text-sm text-red-600">{error}</div>
  if (!data) return <div className="p-8 text-sm text-muted-foreground">Journal entry not found.</div>

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/finance/journal-entries">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft size={16} />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Journal Entry</h1>
          <p className="text-sm text-muted-foreground">{data.journal_entry_number ?? data.id}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Payment type</p>
            <p className="font-medium">{directionLabel(data.direction)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Entity type</p>
            <p className="font-medium">{entityTypeLabel(data.entity_type)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Entity</p>
            <p className="font-medium">{entityLabel}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Transaction date</p>
            <p className="font-medium">
              {data.transaction_date ? new Date(data.transaction_date).toLocaleDateString('en-IN') : '—'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Amount</p>
            <p className="font-medium">₹{Number(data.amount ?? 0).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Link to</p>
            <p className="font-medium">{linkLabel}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-muted-foreground">Description</p>
            <p className="font-medium">{data.description?.trim() || '—'}</p>
          </div>
          {data.entity_type === 'other' ? (
            <>
              <div>
                <p className="text-muted-foreground">Company</p>
                <p className="font-medium">{data.other_company?.trim() || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Designation</p>
                <p className="font-medium">{data.other_designation?.trim() || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Phone number</p>
                <p className="font-medium">{data.other_phone_number?.trim() || '—'}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-muted-foreground">Note</p>
                <p className="font-medium">{data.other_note?.trim() || '—'}</p>
              </div>
            </>
          ) : null}
          <div>
            <p className="text-muted-foreground">Created by</p>
            <p className="font-medium">{createdByLabel}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Created at</p>
            <p className="font-medium">{data.created_at ? new Date(data.created_at).toLocaleString('en-IN') : '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Payment receipt</p>
            {data.payment_receipt_signed_url ? (
              <a href={data.payment_receipt_signed_url} target="_blank" rel="noreferrer" className="font-medium hover:underline">
                {data.payment_receipt_file_name?.trim() || 'View file'}
              </a>
            ) : (
              <p className="font-medium">{data.payment_receipt_file_name?.trim() || '—'}</p>
            )}
          </div>
          <div>
            <p className="text-muted-foreground">Sales invoice</p>
            {data.sales_invoice_signed_url ? (
              <a href={data.sales_invoice_signed_url} target="_blank" rel="noreferrer" className="font-medium hover:underline">
                {data.sales_invoice_file_name?.trim() || 'View file'}
              </a>
            ) : (
              <p className="font-medium">{data.sales_invoice_file_name?.trim() || '—'}</p>
            )}
          </div>
          {data.purchase_invoices?.id ? (
            <div>
              <p className="text-muted-foreground">Purchase invoice</p>
              <Link href={`/dashboard/finance/purchase-invoices/${data.purchase_invoices.id}`} className="font-medium hover:underline">
                {data.purchase_invoices.pi_number ?? data.purchase_invoices.id}
              </Link>
            </div>
          ) : null}
          {data.dispatch_sales_invoices?.id ? (
            <div>
              <p className="text-muted-foreground">Sales invoice link</p>
              <Link href={`/dashboard/finance/sales-invoices/${data.dispatch_sales_invoices.id}`} className="font-medium hover:underline">
                {data.dispatch_sales_invoices.invoice_number ?? data.dispatch_sales_invoices.id}
              </Link>
            </div>
          ) : null}
          {data.sales_orders?.id ? (
            <div>
              <p className="text-muted-foreground">Proforma link</p>
              <Link href={`/dashboard/sales/${data.sales_orders.id}/proforma`} className="font-medium hover:underline">
                {data.sales_orders.order_number ?? data.sales_orders.id}
              </Link>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <EntityActivityLog entityType="journal_entry" entityId={data?.id} />
    </div>
  )
}
