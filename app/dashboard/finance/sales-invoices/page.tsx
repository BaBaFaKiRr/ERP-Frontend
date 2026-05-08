'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type DispatchSalesInvoice = {
  id: string
  invoice_number: string
  sales_order_id: string
  dispatch_order_id: string
  sales_orders?: { order_number?: string | null } | null
  dispatch_orders?: { do_number?: string | null; customer_name?: string | null } | null
  status: 'active' | 'cancelled'
  total_amount: number
  created_at: string
}

type InvoiceFamilyGroup = {
  key: string
  rows: DispatchSalesInvoice[]
  latestCreatedAt: string
}

function familyKey(invoiceNumber: string): string {
  const m = invoiceNumber.match(/^(.*)-\d{3}$/)
  return m?.[1] ?? invoiceNumber
}

export default function SalesInvoicesPage() {
  const router = useRouter()
  const [rows, setRows] = useState<DispatchSalesInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'cancelled'>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [expandedFamilies, setExpandedFamilies] = useState<Record<string, boolean>>({})

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await erpFetch<{ data: DispatchSalesInvoice[] }>('/api/dispatch-sales-invoices')
        setRows(res.data ?? [])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load sales invoices')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false

      if (fromDate) {
        const rowDate = new Date(row.created_at)
        const minDate = new Date(`${fromDate}T00:00:00`)
        if (rowDate < minDate) return false
      }
      if (toDate) {
        const rowDate = new Date(row.created_at)
        const maxDate = new Date(`${toDate}T23:59:59`)
        if (rowDate > maxDate) return false
      }

      if (!q) return true
      const haystack = [
        row.invoice_number,
        row.sales_orders?.order_number ?? '',
        row.dispatch_orders?.customer_name ?? '',
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [rows, search, statusFilter, fromDate, toDate])

  const groupedRows = useMemo<InvoiceFamilyGroup[]>(() => {
    const families = new Map<string, DispatchSalesInvoice[]>()
    for (const row of filteredRows) {
      const key = familyKey(row.invoice_number)
      const existing = families.get(key) ?? []
      existing.push(row)
      families.set(key, existing)
    }

    const groups: InvoiceFamilyGroup[] = []
    for (const [key, familyRows] of families.entries()) {
      const sortedRows = familyRows
        .slice()
        .sort((a, b) => a.invoice_number.localeCompare(b.invoice_number, undefined, { numeric: true }))
      const latestCreatedAt = sortedRows
        .slice()
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at
      groups.push({ key, rows: sortedRows, latestCreatedAt: latestCreatedAt ?? sortedRows[0].created_at })
    }

    return groups.sort(
      (a, b) => new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime(),
    )
  }, [filteredRows])

  const toggleFamily = (key: string) => {
    setExpandedFamilies((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <Button asChild variant="ghost" className="pl-0">
        <Link href="/dashboard/finance">
          <ArrowLeft className="size-4 mr-2" /> Back to Accounts
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Sales Invoices</CardTitle>
          <CardDescription>
            Grouped by parent invoice family. Search by invoice no, sales order no, or customer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice / sales order / customer"
              className="md:col-span-2"
            />
            <Select value={statusFilter} onValueChange={(v: 'all' | 'active' | 'cancelled') => setStatusFilter(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>

          {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {!loading && !error && groupedRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sales invoices found.</p>
          ) : null}
          {groupedRows.length > 0 ? (
            <div className="space-y-2">
              {groupedRows.map((group) => {
                const isFamily = group.rows.length > 1
                const expanded = Boolean(expandedFamilies[group.key])
                const first = group.rows[0]
                return (
                  <div key={group.key} className="rounded-md border border-border/70">
                    <div className="flex items-center justify-between gap-3 p-3">
                      <button
                        type="button"
                        className="flex min-w-0 items-center gap-2 text-left"
                        disabled={!isFamily}
                        onClick={() => (isFamily ? toggleFamily(group.key) : undefined)}
                      >
                        {isFamily ? (
                          expanded ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />
                        ) : (
                          <span className="inline-block w-4" />
                        )}
                        <span className="font-mono font-medium">
                          {isFamily ? `${group.key}-...` : first.invoice_number}
                        </span>
                      </button>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>{first.sales_orders?.order_number ?? '—'} • {first.dispatch_orders?.customer_name ?? '-'}</p>
                        <p>{group.rows.length} invoice{group.rows.length > 1 ? 's' : ''}</p>
                      </div>
                    </div>

                    {isFamily && expanded ? (
                      <div className="space-y-2 border-t px-3 py-2">
                        {group.rows.map((row) => (
                          <div
                            key={row.id}
                            className="grid cursor-pointer grid-cols-1 gap-2 rounded-md border p-2 hover:bg-muted/40 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]"
                            onClick={() => router.push(`/dashboard/finance/sales-invoices/${row.id}`)}
                          >
                            <p className="font-mono">{row.invoice_number}</p>
                            <p className="text-sm">{row.sales_orders?.order_number ?? '—'}</p>
                            <p className="text-sm">{row.dispatch_orders?.do_number ?? '—'}</p>
                            <p className="text-sm">₹{Number(row.total_amount ?? 0).toFixed(2)}</p>
                            <p className="text-sm">
                              <span className={row.status === 'active' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                {row.status === 'active' ? 'Active' : 'Cancelled'}
                              </span>
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {!isFamily ? (
                      <div
                        className="grid cursor-pointer grid-cols-1 gap-2 border-t px-3 py-2 hover:bg-muted/40 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]"
                        onClick={() => router.push(`/dashboard/finance/sales-invoices/${first.id}`)}
                      >
                        <p className="font-mono">{first.invoice_number}</p>
                        <p className="text-sm">{first.sales_orders?.order_number ?? '—'}</p>
                        <p className="text-sm">{first.dispatch_orders?.do_number ?? '—'}</p>
                        <p className="text-sm">₹{Number(first.total_amount ?? 0).toFixed(2)}</p>
                        <p className="text-sm">
                          <span className={first.status === 'active' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                            {first.status === 'active' ? 'Active' : 'Cancelled'}
                          </span>
                        </p>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
