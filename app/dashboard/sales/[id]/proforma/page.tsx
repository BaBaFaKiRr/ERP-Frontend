'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ProformaInvoiceDocument, type ProformaLine } from '@/components/sales/ProformaInvoiceDocument'
import { ArrowLeft, FileDown } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { downloadProformaPdf } from '@/lib/proforma-pdf'
import './print.css'

type ItemJoin = {
  sku: string
  name: string
  hsn?: string | null
  uom?: string | null
}

type LineRow = {
  id: string
  quantity: number
  unit_price: number | null
  line_total: number | null
  items?: ItemJoin | null
}

type CustomerJoin = {
  name: string
  billing_address?: string | null
  gst_number?: string | null
  phone?: string | null
}

type SalesOrderPayload = {
  order_number: string
  sequence_base?: string | null
  order_date: string
  total_amount?: number | null
  customers?: CustomerJoin | null
  sales_order_lines?: LineRow[] | null
}

const VALID_DAYS = 15

export default function ProformaInvoicePage() {
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : ''

  const [order, setOrder] = useState<SalesOrderPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pdfBusy, setPdfBusy] = useState(false)
  /** Snapshot when the PI view is generated — Date & Valid Till are based on this */
  const [documentDate] = useState(() => new Date())

  const validUntil = useMemo(() => {
    const d = new Date(documentDate)
    d.setDate(d.getDate() + VALID_DAYS)
    return d
  }, [documentDate])

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const res = await erpFetch<{ data: SalesOrderPayload }>(`/api/sales-orders/${id}`)
      setOrder(res.data ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load order')
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const handleDownloadPdf = async () => {
    if (!order || !id) return
    setPdfBusy(true)
    try {
      const safe = order.order_number.replace(/[^\w.-]+/g, '_')
      await downloadProformaPdf({
        orderId: id,
        fileName: `PI-${safe}.pdf`,
        documentDate,
        validUntil,
      })
    } finally {
      setPdfBusy(false)
    }
  }

  if (loading && !order) {
    return (
      <div className="p-8 text-muted-foreground pi-no-print">Loading proforma…</div>
    )
  }

  if (error || !order) {
    return (
      <div className="p-8 pi-no-print">
        <Button variant="ghost" asChild className="mb-4">
          <Link href={id ? `/dashboard/sales/${id}` : '/dashboard/sales'}>
            <ArrowLeft className="mr-2 size-4" />
            Back
          </Link>
        </Button>
        <p className="text-destructive">{error ?? 'Order not found'}</p>
      </div>
    )
  }

  const linesRaw = order.sales_order_lines ?? []
  const proformaLines: ProformaLine[] = linesRaw.map((line) => {
    const it = line.items
    return {
      sku: it?.sku ?? '—',
      name: it?.name ?? '—',
      hsn: it?.hsn?.trim() ? it.hsn.trim() : null,
      uom: it?.uom?.trim() ? it.uom.trim() : null,
      quantity: line.quantity,
      unit_price: line.unit_price,
      line_total: line.line_total,
    }
  })

  const cust = order.customers

  return (
    <div className="proforma-print-root min-h-screen bg-neutral-200">
      <div className="pi-no-print sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="max-w-[210mm] mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/dashboard/sales/${id}`}>
                <ArrowLeft className="size-4 mr-1" />
                Order
              </Link>
            </Button>
            <span className="text-sm text-muted-foreground">Proforma invoice (A4 preview)</span>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="default"
              disabled={pdfBusy}
              onClick={() => void handleDownloadPdf()}
              className="gap-2"
            >
              <FileDown className="size-4" />
              {pdfBusy ? 'Preparing PDF…' : 'Download PDF'}
            </Button>
          </div>
        </div>
      </div>

      <div className="py-8 pb-16 flex justify-center print:py-0 print:justify-start print:bg-white">
        <div
          id="proforma-pdf-source"
          className="w-[210mm] max-w-[calc(100vw-2rem)] shrink-0 bg-white text-black shadow-[0_2px_14px_rgba(0,0,0,0.1)] border border-neutral-300/90 overflow-hidden box-border print:shadow-none print:border-0 print:max-w-none"
        >
          <ProformaInvoiceDocument
            salesOrderNumber={order.order_number}
            documentDate={documentDate}
            validUntil={validUntil}
            customerName={cust?.name ?? '—'}
            billingAddress={cust?.billing_address ?? null}
            gstNumber={cust?.gst_number ?? null}
            phone={cust?.phone ?? null}
            lines={proformaLines}
          />
        </div>
      </div>
    </div>
  )
}
