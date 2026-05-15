'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { erpFetch } from '@/lib/erp-api'
import { ArrowLeft, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type StatementObjectType = 'sales_invoice' | 'purchase_invoice' | 'debit_note' | 'payment_entry' | 'journal_entry' | 'credit_note'

type StatementLine = {
  object_type: StatementObjectType
  id: string
  number: string
  date: string
  status?: string | null
  amount: number
  signed_amount: number
  running_balance: number
}

type StatementResponse = {
  entity: {
    type: 'supplier' | 'customer'
    id: string
    name: string
    code?: string | null
  }
  period: {
    from?: string | null
    to?: string | null
  }
  balance: number
  lines: StatementLine[]
}

const OBJECT_TYPE_LABELS: Record<StatementObjectType, string> = {
  sales_invoice: 'Sales Invoice',
  purchase_invoice: 'Purchase Invoice',
  debit_note: 'Debit Note',
  payment_entry: 'Payment Entry',
  journal_entry: 'Journal Entry',
  credit_note: 'Credit Note',
}

function formatCurrency(value: number): string {
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatSignedCurrency(value: number): string {
  const prefix = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${prefix}${formatCurrency(Math.abs(value))}`
}

function formatPeriod(period: StatementResponse['period']): string {
  const from = period.from?.trim() || ''
  const to = period.to?.trim() || ''
  if (from && to) return `${from} to ${to}`
  if (from) return `From ${from}`
  if (to) return `Up to ${to}`
  return 'All dates'
}

function detailHref(line: StatementLine): string {
  switch (line.object_type) {
    case 'sales_invoice':
      return `/dashboard/finance/sales-invoices/${line.id}`
    case 'purchase_invoice':
      return `/dashboard/finance/purchase-invoices/${line.id}`
    case 'debit_note':
      return `/dashboard/finance/debit-notes/${line.id}`
    case 'payment_entry':
      return `/dashboard/finance/payment-entries/${line.id}`
    case 'journal_entry':
      return `/dashboard/finance/journal-entries/${line.id}`
    case 'credit_note':
      return `/dashboard/finance/credit-notes/${line.id}`
  }
}

export default function StatementOfAccountViewPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading statement of account...</div>}>
      <StatementOfAccountViewContent />
    </Suspense>
  )
}

function StatementOfAccountViewContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const entityType = searchParams.get('entity_type')
  const entityId = searchParams.get('entity_id')
  const fromDate = searchParams.get('from') ?? ''
  const toDate = searchParams.get('to') ?? ''

  const [statement, setStatement] = useState<StatementResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (entityType) params.set('entity_type', entityType)
    if (entityId) params.set('entity_id', entityId)
    if (fromDate) params.set('from', fromDate)
    if (toDate) params.set('to', toDate)
    return params.toString()
  }, [entityType, entityId, fromDate, toDate])

  useEffect(() => {
    if (!entityType || !entityId || (entityType !== 'supplier' && entityType !== 'customer')) {
      setError('A valid supplier or customer is required to view the statement.')
      setLoading(false)
      return
    }

    let active = true
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await erpFetch<{ data: StatementResponse }>(`/api/accounts/statement-of-account?${queryString}`)
        if (!active) return
        setStatement(res.data)
      } catch (e) {
        if (!active) return
        setError(e instanceof Error ? e.message : 'Failed to load statement of account')
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => {
      active = false
    }
  }, [entityType, entityId, queryString])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const entityHeading = statement
    ? `${statement.entity.name}${statement.entity.code ? ` (${statement.entity.code})` : ''}`
    : '—'

  const loadPreview = async () => {
    if (!entityType || !entityId) return
    setShowPreview(true)
    setPreviewLoading(true)
    setPreviewError(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    try {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Not authenticated')
      const baseUrl = process.env.NEXT_PUBLIC_ERP_API_URL?.replace(/\/$/, '')
      if (!baseUrl) throw new Error('NEXT_PUBLIC_ERP_API_URL is not set')
      const response = await fetch(`${baseUrl}/api/accounts/statement-of-account/pdf?${queryString}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || 'Failed to load statement preview')
      }
      const blob = await response.blob()
      setPreviewUrl(URL.createObjectURL(blob))
    } catch (e) {
      setPreviewError(e instanceof Error ? e.message : 'Failed to load statement preview')
    } finally {
      setPreviewLoading(false)
    }
  }

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading statement of account...</div>
  if (error) {
    return (
      <div className="p-8 space-y-4">
        <p className="text-sm text-red-600">{error}</p>
        <Button variant="outline" onClick={() => router.push('/dashboard/finance/statement-of-account')}>
          Back to statement search
        </Button>
      </div>
    )
  }
  if (!statement) return <div className="p-8 text-sm text-muted-foreground">Statement not found.</div>

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/finance/statement-of-account">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft size={16} />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Statement of Account for {entityHeading}</h1>
            <p className="text-sm text-muted-foreground">
              {statement.entity.type === 'supplier' ? 'Supplier' : 'Customer'} statement for {formatPeriod(statement.period)}.
            </p>
          </div>
        </div>
        <Button className="gap-2" onClick={() => void loadPreview()}>
          <Printer size={16} />
          Print
        </Button>
      </div>

      <div className={showPreview ? 'grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,34rem)]' : 'space-y-6'}>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Net balance</CardTitle>
              <CardDescription>Running balance after all included transactions.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{formatSignedCurrency(statement.balance)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transactions</CardTitle>
              <CardDescription>Click a document number to open its detail page.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Effect</TableHead>
                    <TableHead className="text-right">Running balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statement.lines.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No transactions found for this entity in the selected period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    statement.lines.map((line) => (
                      <TableRow key={`${line.object_type}-${line.id}`}>
                        <TableCell>{line.date || '—'}</TableCell>
                        <TableCell>{OBJECT_TYPE_LABELS[line.object_type]}</TableCell>
                        <TableCell>
                          <Link href={detailHref(line)} className="font-medium hover:underline">
                            {line.number}
                          </Link>
                        </TableCell>
                        <TableCell>{line.status ?? '—'}</TableCell>
                        <TableCell className="text-right">{formatCurrency(line.amount)}</TableCell>
                        <TableCell className="text-right">{formatSignedCurrency(line.signed_amount)}</TableCell>
                        <TableCell className="text-right">{formatSignedCurrency(line.running_balance)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {showPreview ? (
          <div className="xl:sticky xl:top-6 h-fit">
            <Card>
              <CardHeader>
                <CardTitle>Print preview</CardTitle>
                <CardDescription>PDF preview of this statement.</CardDescription>
              </CardHeader>
              <CardContent>
                {previewError ? (
                  <p className="text-sm text-red-600">{previewError}</p>
                ) : previewUrl ? (
                  <iframe title="Statement of Account Preview" src={previewUrl} className="h-[85vh] w-full rounded-md border" />
                ) : (
                  <p className="text-sm text-muted-foreground">{previewLoading ? 'Generating preview...' : 'Preparing preview...'}</p>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  )
}
