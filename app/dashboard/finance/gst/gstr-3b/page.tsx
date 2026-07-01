'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type Gstr3bResponse = {
  from: string
  to: string
  input_tax_credit: {
    taxable_value: number
    igst: number
    cgst: number
    sgst: number
    cess: number
  }
  purchase_invoices: Array<{
    id: string
    document_number: string
    supplier: string
    taxable_value: number
    cgst: number
    sgst: number
    igst: number
    cess: number
  }>
  debit_notes: Array<{
    id: string
    document_number: string
    taxable_value: number
    cgst: number
    sgst: number
    igst: number
    cess: number
  }>
}

function formatAmount(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function monthStart(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function monthEnd(d: Date): string {
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`
}

export default function Gstr3bPage() {
  const now = new Date()
  const [fromDate, setFromDate] = useState(monthStart(now))
  const [toDate, setToDate] = useState(monthEnd(now))
  const [data, setData] = useState<Gstr3bResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadReport = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await erpFetch<{ data: Gstr3bResponse }>(
        `/api/gst/gstr3b/summary?from=${fromDate}&to=${toDate}`,
      )
      setData(res.data ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load GSTR-3B report')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [fromDate, toDate])

  useEffect(() => {
    void loadReport()
  }, [loadReport])

  const itc = data?.input_tax_credit

  return (
    <div className="p-6 md:p-8 space-y-6">
      <Button asChild variant="ghost" className="pl-0">
        <Link href="/dashboard/finance/gst">
          <ArrowLeft className="size-4 mr-2" /> Back to GST
        </Link>
      </Button>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">GSTR-3B</h1>
          <p className="text-sm text-muted-foreground mt-1">Input tax credit from purchases</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <p className="text-xs text-muted-foreground mb-1">From</p>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-40" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">To</p>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-40" />
          </div>
          <Button onClick={() => void loadReport()} disabled={loading}>
            <RefreshCw className={`size-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading…' : 'Generate'}
          </Button>
        </div>
      </div>

      {itc ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-muted-foreground">Input Tax Credit Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              <div>
                <p className="text-xs text-muted-foreground">Taxable Value</p>
                <p className="text-xl font-semibold tabular-nums">₹{formatAmount(itc.taxable_value)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">IGST</p>
                <p className="text-xl font-semibold tabular-nums">₹{formatAmount(itc.igst)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">CGST</p>
                <p className="text-xl font-semibold tabular-nums">₹{formatAmount(itc.cgst)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">SGST</p>
                <p className="text-xl font-semibold tabular-nums">₹{formatAmount(itc.sgst)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">CESS</p>
                <p className="text-xl font-semibold tabular-nums">₹{formatAmount(itc.cess)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Purchase Invoices</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PI Number</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Taxable Value</TableHead>
                <TableHead className="text-right">CGST</TableHead>
                <TableHead className="text-right">SGST</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.purchase_invoices ?? []).map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono">{row.document_number}</TableCell>
                  <TableCell>{row.supplier}</TableCell>
                  <TableCell className="text-right tabular-nums">₹{formatAmount(row.taxable_value)}</TableCell>
                  <TableCell className="text-right tabular-nums">₹{formatAmount(row.cgst)}</TableCell>
                  <TableCell className="text-right tabular-nums">₹{formatAmount(row.sgst)}</TableCell>
                </TableRow>
              ))}
              {!loading && (data?.purchase_invoices ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No purchase invoices in this period.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Debit Notes</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>DN Number</TableHead>
                <TableHead className="text-right">Taxable Value</TableHead>
                <TableHead className="text-right">CGST</TableHead>
                <TableHead className="text-right">SGST</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.debit_notes ?? []).map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono">{row.document_number}</TableCell>
                  <TableCell className="text-right tabular-nums">₹{formatAmount(row.taxable_value)}</TableCell>
                  <TableCell className="text-right tabular-nums">₹{formatAmount(row.cgst)}</TableCell>
                  <TableCell className="text-right tabular-nums">₹{formatAmount(row.sgst)}</TableCell>
                </TableRow>
              ))}
              {!loading && (data?.debit_notes ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No debit notes in this period.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
