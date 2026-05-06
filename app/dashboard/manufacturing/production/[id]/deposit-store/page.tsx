'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'

type LineDetailsBundle = {
  line?: { id: string; name?: string | null } | null
  line_materials?: Array<{
    id: string
    item_id: string
    qty_on_hand: number
    bucket?: 'wastage' | string
    item?: { id: string; sku?: string | null; name?: string | null } | null
  }>
}

export default function DepositToStorePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [lineName, setLineName] = useState<string>('Line')
  const [rows, setRows] = useState<
    Array<{
      id: string
      item_id: string
      source_bucket: 'normal' | 'wastage'
      label: string
      qty_on_hand: number
      selected: boolean
      qty_to_deposit: string
    }>
  >([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    void (async () => {
      const res = await erpFetch<{ data: LineDetailsBundle }>(`/api/production-lines/${params.id}/details`)
      setLineName(res.data?.line?.name ?? 'Line')
      setRows(
        (res.data?.line_materials ?? []).map((m) => ({
          id: m.id,
          item_id: m.item_id,
          source_bucket: m.bucket === 'wastage' ? 'wastage' : 'normal',
          label: `${m.item?.sku ?? '—'}${m.bucket === 'wastage' ? ' Wastage' : ''} - ${m.item?.name ?? 'Item'}`,
          qty_on_hand: Number(m.qty_on_hand ?? 0),
          selected: false,
          qty_to_deposit: '',
        })),
      )
    })()
  }, [params.id])

  const selectedRows = useMemo(
    () => rows.filter((r) => r.selected && Number(r.qty_to_deposit || 0) > 0),
    [rows],
  )

  const updateRow = (idx: number, patch: Partial<(typeof rows)[number]>) =>
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))

  const submitDeposit = async () => {
    for (const r of rows) {
      if (!r.selected) continue
      const q = Number(r.qty_to_deposit || 0)
      if (!(q > 0)) return alert('Selected rows require qty to deposit')
      if (q > r.qty_on_hand) return alert(`Qty to deposit cannot exceed qty at hand for ${r.label}`)
    }
    setSubmitting(true)
    try {
      await erpFetch('/api/material-deposit-requests', {
        method: 'POST',
        body: JSON.stringify({
          production_line_id: params.id,
          lines: rows
            .filter((r) => r.selected)
            .map((r) => ({
              item_id: r.item_id,
              quantity: Number(r.qty_to_deposit || 0),
              source_bucket: r.source_bucket,
            })),
        }),
      })
      router.push('/dashboard/inventory/deposit-requests')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <Button asChild variant="ghost" className="pl-0">
        <Link href={`/dashboard/manufacturing/production/${params.id}`}>
          <ArrowLeft className="size-4 mr-2" /> Back to line
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Deposit to store · {lineName}</CardTitle>
          <CardDescription>Select one or more items from material at hand and enter deposit quantities.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No material at hand.</p>
          ) : (
            <>
              <div className="hidden md:grid md:grid-cols-[40px_1fr_160px_160px] gap-2 px-1 text-xs font-medium text-muted-foreground">
                <p />
                <p>Item</p>
                <p>Qty at hand</p>
                <p>Qty to deposit</p>
              </div>
              <div className="space-y-1">
                {rows.map((r, idx) => (
                  <div key={r.id} className="grid grid-cols-1 md:grid-cols-[40px_1fr_160px_160px] gap-2 items-center rounded-md border p-2">
                    <div className="flex justify-center">
                      <Checkbox checked={r.selected} onCheckedChange={(v) => updateRow(idx, { selected: Boolean(v) })} />
                    </div>
                    <p className="text-sm">{r.label}</p>
                    <Input value={String(r.qty_on_hand)} readOnly />
                    <Input
                      type="number"
                      min="0"
                      value={r.qty_to_deposit}
                      disabled={!r.selected}
                      onChange={(e) => updateRow(idx, { qty_to_deposit: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="flex justify-end">
            <Button onClick={() => void submitDeposit()} disabled={submitting || selectedRows.length === 0}>
              {submitting ? 'Submitting…' : 'Deposit'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

