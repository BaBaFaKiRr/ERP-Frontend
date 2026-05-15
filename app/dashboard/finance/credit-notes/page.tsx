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

type CreditNoteRow = {
  id: string
  cn_number: string
  credit_note_date?: string | null
  rounded_total?: number | null
  created_at?: string | null
  customers?: { name?: string | null } | null
  dispatch_sales_invoices?: { id?: string | null; invoice_number?: string | null } | null
}

export default function CreditNotesPage() {
  const router = useRouter()
  const [rows, setRows] = useState<CreditNoteRow[]>([])
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
      const res = await erpFetch<{ data: CreditNoteRow[] }>('/api/credit-notes')
      setRows(res.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load credit notes')
    } finally {
      setLoading(false)
    }
  }

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((row) => {
      const customer = (row.customers?.name ?? '').toLowerCase()
      return (
        row.cn_number.toLowerCase().includes(term) ||
        (row.dispatch_sales_invoices?.invoice_number ?? '').toLowerCase().includes(term) ||
        customer.includes(term)
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
            <h1 className="text-3xl font-bold">Credit Notes</h1>
            <p className="mt-1 text-sm text-muted-foreground">Log of credit notes issued against sales invoices.</p>
          </div>
        </div>
        <Link href="/dashboard/finance/credit-notes/new">
          <Button className="gap-2">
            <Plus size={16} />
            Create Credit Note
          </Button>
        </Link>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>All Credit Notes</CardTitle>
          <CardDescription>Click a row to open the credit note preview.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by credit note number, sales invoice, or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading credit notes...</p>
          ) : filteredRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No credit notes found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Credit Note</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Sales Invoice</TableHead>
                  <TableHead className="text-right">Rounded Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/dashboard/finance/credit-notes/${row.id}`)}
                  >
                    <TableCell className="font-mono font-medium">{row.cn_number}</TableCell>
                    <TableCell>
                      {row.credit_note_date ? new Date(row.credit_note_date).toLocaleDateString('en-IN') : '—'}
                    </TableCell>
                    <TableCell>{row.customers?.name ?? '—'}</TableCell>
                    <TableCell>{row.dispatch_sales_invoices?.invoice_number ?? '—'}</TableCell>
                    <TableCell className="text-right">₹{Number(row.rounded_total ?? 0).toFixed(2)}</TableCell>
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
