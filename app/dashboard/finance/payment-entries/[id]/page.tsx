'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type PaymentEntryDetail = {
  id: string
  payment_entry_number?: string | null
  payment_date?: string | null
  amount?: number | null
  entity_name?: string | null
  deposited_name_on_account?: string | null
  deposited_bank_name?: string | null
  deposited_account_number?: string | null
  deposited_ifsc_code?: string | null
  payment_receipt_file_name?: string | null
  suppliers?: { name?: string | null; supplier_code?: string | null } | null
  customers?: { name?: string | null } | null
  purchase_invoices?: { id?: string | null; pi_number?: string | null } | null
  created_by_user?: { first_name?: string | null; last_name?: string | null; email?: string | null } | null
  created_at?: string | null
}

export default function PaymentEntryDetailPage() {
  const params = useParams<{ id: string }>()
  const [data, setData] = useState<PaymentEntryDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void load()
  }, [params.id])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await erpFetch<{ data: PaymentEntryDetail }>(`/api/payment-entries/${params.id}`)
      setData(res.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load payment entry')
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
    return data.entity_name?.trim() || '—'
  }, [data])

  const createdByLabel = useMemo(() => {
    const user = data?.created_by_user
    if (!user) return '—'
    const name = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()
    return name || user.email || '—'
  }, [data?.created_by_user])

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading payment entry...</div>
  if (error) return <div className="p-8 text-sm text-red-600">{error}</div>
  if (!data) return <div className="p-8 text-sm text-muted-foreground">Payment entry not found.</div>

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/finance/payment-entries">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft size={16} />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Payment Entry</h1>
          <p className="text-sm text-muted-foreground">{data.payment_entry_number ?? data.id}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Entity</p>
            <p className="font-medium">{entityLabel}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Payment date</p>
            <p className="font-medium">{data.payment_date ? new Date(data.payment_date).toLocaleDateString('en-IN') : '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Amount</p>
            <p className="font-medium">₹{Number(data.amount ?? 0).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Purchase invoice</p>
            {data.purchase_invoices?.id ? (
              <Link href={`/dashboard/finance/purchase-invoices/${data.purchase_invoices.id}`} className="font-medium hover:underline">
                {data.purchase_invoices.pi_number ?? data.purchase_invoices.id}
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
            <p className="text-muted-foreground">Deposited to</p>
            <p className="font-medium">
              {data.deposited_name_on_account ?? '—'} · {data.deposited_bank_name ?? '—'} · {data.deposited_account_number ?? '—'} ·{' '}
              {data.deposited_ifsc_code ?? '—'}
            </p>
          </div>
          <div className="md:col-span-2">
            <p className="text-muted-foreground">Payment receipt</p>
            <p className="font-medium">{data.payment_receipt_file_name?.trim() ? data.payment_receipt_file_name : '—'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
