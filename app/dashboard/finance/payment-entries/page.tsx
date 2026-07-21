'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Search } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { GenerateReportButton } from '@/components/reports/generate-report-button'

type PaymentEntryRow = {
  id: string
  payment_entry_number?: string | null
  payment_date?: string | null
  amount?: number | null
  entity_name?: string | null
  suppliers?: { name?: string | null; supplier_code?: string | null } | null
  customers?: { name?: string | null } | null
  purchase_invoices?: { pi_number?: string | null } | null
  created_by_user?: { first_name?: string | null; last_name?: string | null; email?: string | null } | null
  created_at?: string | null
}

function entityLabel(row: PaymentEntryRow): string {
  if (row.suppliers?.name) {
    const code = row.suppliers.supplier_code?.trim()
    return `${code ? `${code} - ` : ''}${row.suppliers.name}`
  }
  if (row.customers?.name) return row.customers.name
  return row.entity_name?.trim() || '—'
}

function createdByLabel(row: PaymentEntryRow): string {
  const user = row.created_by_user
  if (!user) return '—'
  const name = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()
  return name || user.email || '—'
}

export default function PaymentEntriesPage() {
  const router = useRouter()
  const [rows, setRows] = useState<PaymentEntryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    void load()
  }, [])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await erpFetch<{ data: PaymentEntryRow[] }>('/api/payment-entries')
      setRows(res.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load payment entries')
    } finally {
      setLoading(false)
    }
  }

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((row) => {
      const entity = entityLabel(row).toLowerCase()
      return (
        (row.payment_entry_number ?? '').toLowerCase().includes(term) ||
        (row.purchase_invoices?.pi_number ?? '').toLowerCase().includes(term) ||
        entity.includes(term)
      )
    })
  }, [rows, searchTerm])

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/dashboard/finance">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft size={16} />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Payment Entries</h1>
            <p className="mt-1 text-sm text-muted-foreground">All recorded payments across purchase invoices and manual entries.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <GenerateReportButton reportType="payment_entries" />
          <Link href="/dashboard/finance/payment-entries/new">
            <Button className="gap-2">
              <Plus size={16} />
              Add Payment Entry
            </Button>
          </Link>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>All Payment Entries</CardTitle>
          <CardDescription>Click a row to open the payment entry.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by payment entry number, entity, or PI..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading payment entries...</p>
          ) : filteredRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payment entries found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment Entry</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Purchase Invoice</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => (
                  <TableRow key={row.id} className="cursor-pointer" onClick={() => router.push(`/dashboard/finance/payment-entries/${row.id}`)}>
                    <TableCell className="font-mono font-medium">{row.payment_entry_number ?? row.id}</TableCell>
                    <TableCell>{row.payment_date ? new Date(row.payment_date).toLocaleDateString('en-IN') : '—'}</TableCell>
                    <TableCell>{entityLabel(row)}</TableCell>
                    <TableCell>{row.purchase_invoices?.pi_number ?? '—'}</TableCell>
                    <TableCell>{createdByLabel(row)}</TableCell>
                    <TableCell className="text-right">₹{Number(row.amount ?? 0).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
