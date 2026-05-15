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

type JournalEntryRow = {
  id: string
  journal_entry_number?: string | null
  direction?: 'received' | 'made' | null
  entity_type?: 'supplier' | 'customer' | 'employee' | 'other' | null
  transaction_date?: string | null
  amount?: number | null
  description?: string | null
  other_name?: string | null
  suppliers?: { name?: string | null; supplier_code?: string | null } | null
  customers?: { name?: string | null } | null
  employees?: { full_name?: string | null; employee_code?: string | null } | null
  created_by_user?: { first_name?: string | null; last_name?: string | null; email?: string | null } | null
  created_at?: string | null
}

type JournalSummary = {
  incoming_funds: number
  outgoing_funds: number
  financial_year_label: string
}

function entityLabel(row: JournalEntryRow): string {
  if (row.suppliers?.name) {
    const code = row.suppliers.supplier_code?.trim()
    return `${code ? `${code} - ` : ''}${row.suppliers.name}`
  }
  if (row.customers?.name) return row.customers.name
  if (row.employees?.full_name) {
    const code = row.employees.employee_code?.trim()
    return `${code ? `${code} - ` : ''}${row.employees.full_name}`
  }
  return row.other_name?.trim() || '—'
}

function createdByLabel(row: JournalEntryRow): string {
  const user = row.created_by_user
  if (!user) return '—'
  const name = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()
  return name || user.email || '—'
}

function directionLabel(direction?: string | null): string {
  if (direction === 'received') return 'Payment received'
  if (direction === 'made') return 'Payment made'
  return '—'
}

function formatCurrency(value: number): string {
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function JournalEntriesPage() {
  const router = useRouter()
  const [rows, setRows] = useState<JournalEntryRow[]>([])
  const [summary, setSummary] = useState<JournalSummary | null>(null)
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
      const res = await erpFetch<{ data: JournalEntryRow[]; summary: JournalSummary }>('/api/journal-entries')
      setRows(res.data ?? [])
      setSummary(res.summary ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load journal entries')
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
        (row.journal_entry_number ?? '').toLowerCase().includes(term) ||
        (row.description ?? '').toLowerCase().includes(term) ||
        directionLabel(row.direction).toLowerCase().includes(term) ||
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
            <h1 className="text-3xl font-bold">Journal Entries</h1>
            <p className="mt-1 text-sm text-muted-foreground">Record payments received and made across entities.</p>
          </div>
        </div>
        <Link href="/dashboard/finance/journal-entries/new">
          <Button className="gap-2">
            <Plus size={16} />
            Create Journal Entry
          </Button>
        </Link>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Incoming funds · FY {summary?.financial_year_label ?? '—'}</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(summary?.incoming_funds ?? 0)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Outgoing funds · FY {summary?.financial_year_label ?? '—'}</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(summary?.outgoing_funds ?? 0)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Journal Entries</CardTitle>
          <CardDescription>Click a row to open the journal entry.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by number, entity, direction, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading journal entries...</p>
          ) : filteredRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No journal entries found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Journal Entry</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/dashboard/finance/journal-entries/${row.id}`)}
                  >
                    <TableCell className="font-mono font-medium">{row.journal_entry_number ?? row.id}</TableCell>
                    <TableCell>{directionLabel(row.direction)}</TableCell>
                    <TableCell>
                      {row.transaction_date ? new Date(row.transaction_date).toLocaleDateString('en-IN') : '—'}
                    </TableCell>
                    <TableCell>{entityLabel(row)}</TableCell>
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
