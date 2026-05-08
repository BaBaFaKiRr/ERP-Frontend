'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { erpFetch } from '@/lib/erp-api'
import { ChevronDown, ChevronRight, Plus, Settings } from 'lucide-react'
import Link from 'next/link'

type InvoiceRequest = {
  id: string
  do_number?: string | null
  customer_name?: string | null
  created_at: string
}

type SalesInvoice = {
  id: string
  invoice_number?: string | null
  sales_order_id: string
  sales_orders?: { order_number?: string | null } | null
  dispatch_orders?: { customer_name?: string | null; do_number?: string | null } | null
  status?: 'active' | 'cancelled'
  total_amount?: number | null
  created_at: string
}

type InvoiceFamilyGroup = {
  key: string
  rows: SalesInvoice[]
  latestCreatedAt: string
}

function familyKey(invoiceNumber: string): string {
  const m = invoiceNumber.match(/^(.*)-\d{3}$/)
  return m?.[1] ?? invoiceNumber
}

export default function FinancePage() {
  const [invoiceRequestCount, setInvoiceRequestCount] = useState(0)
  const [invoiceRequestsPreview, setInvoiceRequestsPreview] = useState<InvoiceRequest[]>([])
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>([])
  const [salesInvoiceSearch, setSalesInvoiceSearch] = useState('')
  const [salesInvoiceStatusFilter, setSalesInvoiceStatusFilter] = useState<'all' | 'active' | 'cancelled'>('all')
  const [salesInvoiceFromDate, setSalesInvoiceFromDate] = useState('')
  const [salesInvoiceToDate, setSalesInvoiceToDate] = useState('')
  const [expandedWidgetFamilies, setExpandedWidgetFamilies] = useState<Record<string, boolean>>({})
  const [loadingMetrics, setLoadingMetrics] = useState(true)

  useEffect(() => {
    void (async () => {
      setLoadingMetrics(true)
      try {
        const [invoiceRequestsRes, salesInvoicesRes] = await Promise.all([
          erpFetch<{ data: InvoiceRequest[] }>('/api/dispatch/orders?status=awaiting_invoice'),
          erpFetch<{ data: SalesInvoice[] }>('/api/dispatch-sales-invoices'),
        ])

        const invoiceRequests = (invoiceRequestsRes.data ?? [])
          .slice()
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        const salesInvoices = (salesInvoicesRes.data ?? [])
          .slice()
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

        setInvoiceRequestCount(invoiceRequests.length)
        setInvoiceRequestsPreview(invoiceRequests.slice(0, 5))
        setSalesInvoices(salesInvoices)
      } catch {
        setInvoiceRequestCount(0)
        setInvoiceRequestsPreview([])
        setSalesInvoices([])
      } finally {
        setLoadingMetrics(false)
      }
    })()
  }, [])

  const filteredSalesInvoices = useMemo(() => {
    const q = salesInvoiceSearch.trim().toLowerCase()
    return salesInvoices.filter((row) => {
      if (salesInvoiceStatusFilter !== 'all' && (row.status ?? 'active') !== salesInvoiceStatusFilter) {
        return false
      }
      if (salesInvoiceFromDate) {
        if (new Date(row.created_at) < new Date(`${salesInvoiceFromDate}T00:00:00`)) return false
      }
      if (salesInvoiceToDate) {
        if (new Date(row.created_at) > new Date(`${salesInvoiceToDate}T23:59:59`)) return false
      }
      if (!q) return true
      const haystack = [
        row.invoice_number ?? '',
        row.sales_orders?.order_number ?? '',
        row.dispatch_orders?.customer_name ?? '',
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [
    salesInvoices,
    salesInvoiceSearch,
    salesInvoiceStatusFilter,
    salesInvoiceFromDate,
    salesInvoiceToDate,
  ])

  const groupedSalesInvoicesPreview = useMemo<InvoiceFamilyGroup[]>(() => {
    const families = new Map<string, SalesInvoice[]>()
    for (const row of filteredSalesInvoices) {
      const invoiceNumber = row.invoice_number ?? ''
      const key = familyKey(invoiceNumber)
      const existing = families.get(key) ?? []
      existing.push(row)
      families.set(key, existing)
    }

    const groups: InvoiceFamilyGroup[] = []
    for (const [key, familyRows] of families.entries()) {
      const sortedRows = familyRows
        .slice()
        .sort((a, b) => (a.invoice_number ?? '').localeCompare(b.invoice_number ?? '', undefined, { numeric: true }))
      const latestCreatedAt = sortedRows
        .slice()
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at
      groups.push({ key, rows: sortedRows, latestCreatedAt: latestCreatedAt ?? sortedRows[0].created_at })
    }

    return groups
      .sort((a, b) => new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime())
      .slice(0, 5)
  }, [filteredSalesInvoices])

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Accounts</h1>
          <p className="text-gray-600 mt-2">Manage invoice requests, payments, and accounting workflows</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="flex items-center gap-2" asChild>
            <Link href="/dashboard/finance/settings">
              <Settings size={18} />
              Settings
            </Link>
          </Button>
          <Button variant="outline" className="flex items-center gap-2" asChild>
            <Link href="/dashboard/finance/sales-invoices">
              Sales Invoices
            </Link>
          </Button>
          <Button variant="outline" className="flex items-center gap-2" asChild>
            <Link href="/dashboard/finance/invoice-requests">
              Invoice Requests
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="border-border/70 bg-card/70 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-xl font-bold">
                <Link href="/dashboard/finance/invoice-requests" className="hover:underline">
                  Invoice Requests
                </Link>
              </CardTitle>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/finance/invoice-requests">View all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!loadingMetrics && invoiceRequestsPreview.length > 0 ? (
              <div className="mt-3 space-y-2">
                {invoiceRequestsPreview.map((row) => (
                  <Link
                    key={row.id}
                    href={`/dashboard/finance/invoice-requests/${row.id}`}
                    className="block rounded-md border border-border/60 p-2 text-sm hover:bg-muted/40"
                  >
                    <p className="font-mono">{row.do_number ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.customer_name ?? '-'} • {new Date(row.created_at).toLocaleDateString('en-IN')}
                    </p>
                  </Link>
                ))}
              </div>
            ) : null}
            {!loadingMetrics && invoiceRequestCount === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No invoice requests found.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/70 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-xl font-bold">
                <Link href="/dashboard/finance/sales-invoices" className="hover:underline">
                  Sales Invoices
                </Link>
              </CardTitle>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/finance/sales-invoices">View all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(220px,1fr)_150px_130px_130px]">
              <Input
                value={salesInvoiceSearch}
                onChange={(e) => setSalesInvoiceSearch(e.target.value)}
                placeholder="Search invoice / SO / customer"
              />
              <Select
                value={salesInvoiceStatusFilter}
                onValueChange={(v: 'all' | 'active' | 'cancelled') => setSalesInvoiceStatusFilter(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={salesInvoiceFromDate}
                onChange={(e) => setSalesInvoiceFromDate(e.target.value)}
                className="w-full"
              />
              <Input
                type="date"
                value={salesInvoiceToDate}
                onChange={(e) => setSalesInvoiceToDate(e.target.value)}
                className="w-full"
              />
            </div>

            {!loadingMetrics && groupedSalesInvoicesPreview.length > 0 ? (
              <div className="mt-3 space-y-2">
                {groupedSalesInvoicesPreview.map((group) => {
                  const isFamily = group.rows.length > 1
                  const expanded = Boolean(expandedWidgetFamilies[group.key])
                  const first = group.rows[0]
                  return (
                    <div key={group.key} className="rounded-md border border-border/60">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-2 p-2 text-left hover:bg-muted/40"
                        onClick={() =>
                          isFamily
                            ? setExpandedWidgetFamilies((prev) => ({ ...prev, [group.key]: !prev[group.key] }))
                            : undefined
                        }
                      >
                        <span className="flex items-center gap-2">
                          {isFamily ? (
                            expanded ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />
                          ) : (
                            <span className="inline-block w-4" />
                          )}
                          <span className="font-mono">
                            {isFamily ? `${group.key}-...` : first.invoice_number ?? '—'}
                          </span>
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {first.sales_orders?.order_number ?? '—'}
                        </span>
                      </button>

                      {isFamily && expanded ? (
                        <div className="space-y-1 border-t p-2">
                          {group.rows.map((row) => (
                            <Link
                              key={row.id}
                              href={`/dashboard/finance/sales-invoices/${row.id}`}
                              className="block rounded border border-border/50 p-2 text-sm hover:bg-muted/40"
                            >
                              <p className="font-mono">{row.invoice_number ?? '—'}</p>
                              <p className="text-xs text-muted-foreground">
                                {(row.status ?? 'active') === 'active' ? 'Active' : 'Cancelled'} • ₹
                                {Number(row.total_amount ?? 0).toFixed(2)}
                              </p>
                            </Link>
                          ))}
                        </div>
                      ) : null}

                      {!isFamily ? (
                        <Link
                          href={`/dashboard/finance/sales-invoices/${first.id}`}
                          className="block border-t p-2 text-sm hover:bg-muted/40"
                        >
                          <p className="text-xs text-muted-foreground">
                            {(first.status ?? 'active') === 'active' ? 'Active' : 'Cancelled'} • ₹
                            {Number(first.total_amount ?? 0).toFixed(2)}
                          </p>
                        </Link>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            ) : null}
            {!loadingMetrics && groupedSalesInvoicesPreview.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No sales invoices found.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
