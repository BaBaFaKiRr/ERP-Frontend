'use client'

import { useCallback, useEffect, useMemo, useState, Fragment } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type GstSummaryRow = {
  key: string
  description: string
  parent_key?: string | null
  total_docs: number
  taxable_value: number
  igst: number
  cgst: number
  sgst: number
  cess: number
}

type Gstr1Response = {
  from: string
  to: string
  net_liability: { igst: number; cgst: number; sgst: number; cess: number }
  rows: GstSummaryRow[]
}

function formatAmount(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
}

function monthStart(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function monthEnd(d: Date): string {
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`
}

export default function Gstr1Page() {
  const now = new Date()
  const [fromDate, setFromDate] = useState(monthStart(now))
  const [toDate, setToDate] = useState(monthEnd(now))
  const [data, setData] = useState<Gstr1Response | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    b2b_sez: true,
    exports: true,
    credit_debit_notes: true,
    hsn_summary: true,
  })

  const loadReport = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await erpFetch<{ data: Gstr1Response }>(
        `/api/gst/gstr1/summary?from=${fromDate}&to=${toDate}`,
      )
      setData(res.data ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load GSTR-1 report')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [fromDate, toDate])

  useEffect(() => {
    void loadReport()
  }, [loadReport])

  const topLevelRows = useMemo(
    () => (data?.rows ?? []).filter((r) => !r.parent_key && !['total_liability', 'rounding_difference', 'b2c'].includes(r.key)),
    [data],
  )

  const childRowsByParent = useMemo(() => {
    const map = new Map<string, GstSummaryRow[]>()
    for (const row of data?.rows ?? []) {
      if (!row.parent_key) continue
      const list = map.get(row.parent_key) ?? []
      list.push(row)
      map.set(row.parent_key, list)
    }
    return map
  }, [data])

  const footerRows = useMemo(
    () => (data?.rows ?? []).filter((r) => ['total_liability', 'rounding_difference'].includes(r.key)),
    [data],
  )

  const renderRow = (row: GstSummaryRow, depth = 0) => {
    const children = childRowsByParent.get(row.key) ?? []
    const hasChildren = children.length > 0
    const isExpanded = expanded[row.key] ?? false
    return (
      <Fragment key={row.key}>
        <TableRow key={row.key} className={depth > 0 ? 'bg-muted/20' : undefined}>
          <TableCell className="w-10 text-muted-foreground">{depth === 0 ? '' : ''}</TableCell>
          <TableCell>
            <div className="flex items-center gap-1" style={{ paddingLeft: depth * 16 }}>
              {hasChildren ? (
                <button
                  type="button"
                  className="p-0.5"
                  onClick={() => setExpanded((prev) => ({ ...prev, [row.key]: !prev[row.key] }))}
                >
                  {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                </button>
              ) : (
                <span className="inline-block w-5" />
              )}
              <span className={depth === 0 ? 'font-medium' : ''}>{row.description}</span>
            </div>
          </TableCell>
          <TableCell className="text-right tabular-nums">{formatAmount(row.total_docs)}</TableCell>
          <TableCell className="text-right tabular-nums">{formatAmount(row.taxable_value)}</TableCell>
          <TableCell className="text-right tabular-nums">{formatAmount(row.igst)}</TableCell>
          <TableCell className="text-right tabular-nums">{formatAmount(row.cgst)}</TableCell>
          <TableCell className="text-right tabular-nums">{formatAmount(row.sgst)}</TableCell>
          <TableCell className="text-right tabular-nums">{formatAmount(row.cess)}</TableCell>
        </TableRow>
        {hasChildren && isExpanded ? children.map((child) => renderRow(child, depth + 1)) : null}
      </Fragment>
    )
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <Button asChild variant="ghost" className="pl-0">
        <Link href="/dashboard/finance/gst">
          <ArrowLeft className="size-4 mr-2" /> Back to GST
        </Link>
      </Button>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">GSTR-1</h1>
          <p className="text-sm text-muted-foreground mt-1">Summary of outward supplies (Books)</p>
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

      {data?.net_liability ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-muted-foreground">
              Net Output GST Liability (Credit − Debit)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">IGST Account</p>
                <p className="text-xl font-semibold tabular-nums">₹ {formatAmount(data.net_liability.igst)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">CGST Account</p>
                <p className="text-xl font-semibold tabular-nums">₹ {formatAmount(data.net_liability.cgst)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">SGST Account</p>
                <p className="text-xl font-semibold tabular-nums">₹ {formatAmount(data.net_liability.sgst)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">CESS Account</p>
                <p className="text-xl font-semibold tabular-nums">₹ {formatAmount(data.net_liability.cess)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Summary of Books</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Total Docs</TableHead>
                <TableHead className="text-right">Taxable Value</TableHead>
                <TableHead className="text-right">IGST</TableHead>
                <TableHead className="text-right">CGST</TableHead>
                <TableHead className="text-right">SGST</TableHead>
                <TableHead className="text-right">CESS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topLevelRows.map((row) => renderRow(row))}
              {footerRows.map((row) => (
                <TableRow key={row.key} className="font-semibold bg-muted/30">
                  <TableCell />
                  <TableCell>{row.description}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatAmount(row.total_docs)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatAmount(row.taxable_value)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatAmount(row.igst)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatAmount(row.cgst)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatAmount(row.sgst)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatAmount(row.cess)}</TableCell>
                </TableRow>
              ))}
              {!loading && topLevelRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No data for the selected period.
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
