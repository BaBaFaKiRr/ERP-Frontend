'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileText, Receipt } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type GstSummary = {
  financial_year: string
  invoice_count: number
  gst_collected: {
    igst: number
    cgst: number
    sgst: number
    cess: number
    total: number
  }
}

function formatCurrency(value: number): string {
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function GstPage() {
  const [summary, setSummary] = useState<GstSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await erpFetch<{ data: GstSummary }>('/api/gst/summary')
        setSummary(res.data ?? null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load GST summary')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">GST</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Goods and Services Tax — returns and liability summary
        </p>
      </div>

      <Card className="border-border/70 bg-card/70 backdrop-blur-sm mb-6">
        <CardHeader>
          <CardTitle>GST Collected — Current Financial Year</CardTitle>
          <CardDescription>
            {summary ? `FY ${summary.financial_year} (1 Apr – 31 Mar) · ${summary.invoice_count} active invoices` : 'Loading…'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {!loading && summary ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">IGST</p>
                <p className="text-2xl font-semibold tabular-nums">{formatCurrency(summary.gst_collected.igst)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">CGST</p>
                <p className="text-2xl font-semibold tabular-nums">{formatCurrency(summary.gst_collected.cgst)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">SGST</p>
                <p className="text-2xl font-semibold tabular-nums">{formatCurrency(summary.gst_collected.sgst)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">CESS</p>
                <p className="text-2xl font-semibold tabular-nums">{formatCurrency(summary.gst_collected.cess)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
                <p className="text-2xl font-bold tabular-nums text-primary">{formatCurrency(summary.gst_collected.total)}</p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 max-w-3xl">
        <Card className="border-border/70 hover:border-primary/40 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Receipt className="size-8 text-primary" />
              <div>
                <CardTitle>GSTR-1</CardTitle>
                <CardDescription>GST collected on sales — outward supplies</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              HSN-wise breakup, B2B, B2C, exports, SEZ, and credit/debit notes for a selected period.
            </p>
            <Button asChild>
              <Link href="/dashboard/finance/gst/gstr-1">Open GSTR-1</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/70 hover:border-primary/40 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-3">
              <FileText className="size-8 text-primary" />
              <div>
                <CardTitle>GSTR-3B</CardTitle>
                <CardDescription>GST paid on purchases — input tax credit</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Summary of GST paid to suppliers on purchase invoices and debit notes.
            </p>
            <Button asChild variant="outline">
              <Link href="/dashboard/finance/gst/gstr-3b">Open GSTR-3B</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
