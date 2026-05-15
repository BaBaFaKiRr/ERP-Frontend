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

type PurchaseInvoiceRow = {
  id: string
  pi_number: string
  status: string
  total_amount?: number | null
  created_at?: string | null
  suppliers?: { name?: string | null; supplier_code?: string | null } | null
  purchase_orders?: { id?: string | null; po_number?: string | null } | null
  purchase_invoice_receipts?: Array<{ purchase_receipt_id?: string | null }> | null
}

export default function PurchaseInvoicesPage() {
  const router = useRouter()
  const [rows, setRows] = useState<PurchaseInvoiceRow[]>([])
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
      const res = await erpFetch<{ data: PurchaseInvoiceRow[] }>('/api/purchase/invoices')
      setRows(res.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load purchase invoices')
    } finally {
      setLoading(false)
    }
  }

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((row) => {
      const supplier = `${row.suppliers?.supplier_code ?? ''} ${row.suppliers?.name ?? ''}`.toLowerCase()
      return (
        row.pi_number.toLowerCase().includes(term) ||
        (row.purchase_orders?.po_number ?? '').toLowerCase().includes(term) ||
        supplier.includes(term)
      )
    })
  }, [rows, searchTerm])

  const totalValue = rows.reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0)

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
            <h1 className="text-3xl font-bold">Purchase Invoices</h1>
            <p className="mt-1 text-sm text-muted-foreground">Log of purchase invoices generated from purchase receipts.</p>
          </div>
        </div>
        <Link href="/dashboard/finance/purchase-invoices/new">
          <Button className="gap-2">
            <Plus size={16} />
            Generate Purchase Invoice
          </Button>
        </Link>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rows.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalValue.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Draft Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rows.filter((row) => row.status === 'draft').length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Log</CardTitle>
          <CardDescription>Click a row to open purchase invoice details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by PI number, PO number, or supplier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading purchase invoices...</p>
          ) : filteredRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No purchase invoices found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PI Number</TableHead>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Receipts</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => {
                  const supplierLabel = `${row.suppliers?.supplier_code?.trim() ? `${row.suppliers.supplier_code} - ` : ''}${row.suppliers?.name ?? '-'}`
                  return (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/dashboard/finance/purchase-invoices/${row.id}`)}
                    >
                      <TableCell className="font-mono">{row.pi_number}</TableCell>
                      <TableCell>{row.purchase_orders?.po_number ?? '—'}</TableCell>
                      <TableCell>{supplierLabel}</TableCell>
                      <TableCell>{row.status}</TableCell>
                      <TableCell className="text-right">{row.purchase_invoice_receipts?.length ?? 0}</TableCell>
                      <TableCell className="text-right">₹{Number(row.total_amount ?? 0).toFixed(2)}</TableCell>
                      <TableCell>{row.created_at ? new Date(row.created_at).toLocaleDateString('en-GB') : '—'}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
