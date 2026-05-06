'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { erpFetch } from '@/lib/erp-api'

type ShiftType = 'day' | 'night'
type PlanningTask = {
  id: string
  item_id: string
  qty: number
  planned_date: string | null
  shift_type: ShiftType
  production_line_id: string
  items?: { id: string; sku?: string | null; name?: string | null } | null
}
type LineItem = { id: string; item_id: string; items?: { id: string; sku: string; name: string } | null }
type LineDetail = { id: string; name: string; production_line_items?: LineItem[] | null }
type LineDetailsBundle = {
  line_materials?: Array<{ item_id: string; qty_on_hand: number; bucket?: 'wastage' | string }>
}
type Bom = {
  output_quantity?: number | null
  bom_lines?: Array<{ quantity_per: number; items?: { id: string; sku?: string | null; name?: string | null } | null }>
}
type MaterialRow = {
  item_id: string
  sku: string
  name: string
  total_qty: string
  opening_balance: string
}
type ProduceEntry = { item_id: string; sku: string; name: string; qty: number; maxQty: number }
type MaterialGroup = { product: ProduceEntry; rows: MaterialRow[] }

function istDefault(): { date: string; shift: ShiftType } {
  const now = new Date()
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  })
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]))
  const date = `${parts.year}-${parts.month}-${parts.day}`
  const hour = Number(parts.hour)
  return { date, shift: hour >= 8 && hour < 20 ? 'day' : 'night' }
}

export default function StartShiftPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [line, setLine] = useState<LineDetail | null>(null)
  const [tasks, setTasks] = useState<PlanningTask[]>([])
  const [date, setDate] = useState(istDefault().date)
  const [shift, setShift] = useState<ShiftType>(istDefault().shift)
  const [produceItemId, setProduceItemId] = useState('')
  const [produceQty, setProduceQty] = useState('')
  const [produceEntries, setProduceEntries] = useState<ProduceEntry[]>([])
  const [materialGroups, setMaterialGroups] = useState<MaterialGroup[]>([])
  const [lineMaterialAtHand, setLineMaterialAtHand] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)
  const [requesting, setRequesting] = useState(false)

  useEffect(() => {
    void (async () => {
      const [lineRes, taskRes, detailsRes] = await Promise.all([
        erpFetch<{ data: LineDetail }>(`/api/production-lines/${params.id}`),
        erpFetch<{ data: PlanningTask[] }>('/api/planning/tasks'),
        erpFetch<{ data: LineDetailsBundle }>(`/api/production-lines/${params.id}/details`),
      ])
      setLine(lineRes.data ?? null)
      setTasks(taskRes.data ?? [])
      const lm = new Map<string, number>()
      for (const row of detailsRes.data?.line_materials ?? []) {
        if (row.bucket === 'wastage') continue
        lm.set(row.item_id, Number(row.qty_on_hand ?? 0))
      }
      setLineMaterialAtHand(Object.fromEntries(lm.entries()))
    })()
  }, [params.id])

  const taskItemMap = useMemo(() => {
    const m = new Map<string, { sku: string; name: string; maxQty: number }>()
    for (const t of tasks) {
      if (t.production_line_id !== params.id) continue
      if (t.planned_date !== date || t.shift_type !== shift) continue
      const prev = m.get(t.item_id)
      m.set(t.item_id, {
        sku: t.items?.sku ?? '—',
        name: t.items?.name ?? 'Item',
        maxQty: (prev?.maxQty ?? 0) + Number(t.qty ?? 0),
      })
    }
    return m
  }, [tasks, params.id, date, shift])

  const taskItems = useMemo(
    () => [...taskItemMap.entries()].map(([item_id, v]) => ({ item_id, ...v })),
    [taskItemMap],
  )

  useEffect(() => {
    setProduceEntries([])
    setMaterialGroups([])
  }, [date, shift])

  useEffect(() => {
    void (async () => {
      if (produceEntries.length === 0) {
        setMaterialGroups([])
        return
      }
      const groups: MaterialGroup[] = []
      for (const p of produceEntries) {
        const mat = new Map<string, { sku: string; name: string; qty: number }>()
        try {
          const b = await erpFetch<{ data: Bom }>(`/api/bom/${p.item_id}`)
          const outQ = Number(b.data?.output_quantity ?? 1) || 1
          for (const bl of b.data?.bom_lines ?? []) {
            const it = bl.items
            if (!it?.id) continue
            const reqQty = (Number(bl.quantity_per ?? 0) / outQ) * p.qty
            const prev = mat.get(it.id)
            mat.set(it.id, {
              sku: it.sku ?? '—',
              name: it.name ?? 'Item',
              qty: (prev?.qty ?? 0) + reqQty,
            })
          }
        } catch {
          /* ignore missing bom */
        }
        groups.push({
          product: p,
          rows: [...mat.entries()].map(([item_id, v]) => ({
            item_id,
            sku: v.sku,
            name: v.name,
            total_qty: String(v.qty),
            opening_balance: String(lineMaterialAtHand[item_id] ?? 0),
          })),
        })
      }
      setMaterialGroups(groups)
    })()
  }, [produceEntries, lineMaterialAtHand])

  const setMaterialOpening = (groupIdx: number, rowIdx: number, value: string) => {
    setMaterialGroups((prev) =>
      prev.map((g, gi) =>
        gi !== groupIdx
          ? g
          : {
              ...g,
              rows: g.rows.map((r, ri) => (ri === rowIdx ? { ...r, opening_balance: value } : r)),
            },
      ),
    )
  }

  const addProduce = () => {
    if (!produceItemId) return
    const picked = taskItemMap.get(produceItemId)
    if (!picked) return
    const q = Number(produceQty || 0)
    if (!(q > 0)) return
    const existing = produceEntries.find((x) => x.item_id === produceItemId)
    const used = existing?.qty ?? 0
    if (q + used > picked.maxQty) {
      alert(`Qty exceeds task bound (${picked.maxQty}) for this item`)
      return
    }
    setProduceEntries((prev) => {
      if (existing) {
        return prev.map((x) => (x.item_id === produceItemId ? { ...x, qty: x.qty + q } : x))
      }
      return [...prev, { item_id: produceItemId, sku: picked.sku, name: picked.name, qty: q, maxQty: picked.maxQty }]
    })
    setProduceQty('')
  }

  const removeProduce = (itemId: string) => {
    setProduceEntries((prev) => prev.filter((x) => x.item_id !== itemId))
  }

  const startShift = async () => {
    if (produceEntries.length === 0) return
    setSaving(true)
    try {
      await erpFetch(`/api/production-lines/${params.id}/start-shift`, {
        method: 'POST',
        body: JSON.stringify({
          products: produceEntries.map((p) => ({ item_id: p.item_id, target_qty: p.qty })),
          shift_date: date,
          shift_type: shift,
          material_issues: materialGroups.flatMap((g) =>
            g.rows.map((m) => {
              const total = Number(m.total_qty || 0)
              const opening = Number(m.opening_balance || 0)
              return {
                item_id: m.item_id,
                opening_balance: opening,
                new_issue_qty: Math.max(0, total - opening),
              }
            }),
          ),
        }),
      })
      router.push(`/dashboard/manufacturing/production/${params.id}`)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to start shift')
    } finally {
      setSaving(false)
    }
  }

  const requestMaterial = async () => {
    if (!confirm('Create material issue request with current details?')) return
    setRequesting(true)
    try {
      await erpFetch('/api/material-issue-requests', {
        method: 'POST',
        body: JSON.stringify({
          production_line_id: params.id,
          shift_date: date,
          shift_type: shift,
          lines: (() => {
            const agg = new Map<string, number>()
            for (const g of materialGroups) {
              for (const m of g.rows) {
                const requestQty = Math.max(0, Number(m.total_qty || 0) - Number(m.opening_balance || 0))
                if (requestQty <= 0) continue
                agg.set(m.item_id, (agg.get(m.item_id) ?? 0) + requestQty)
              }
            }
            return [...agg.entries()].map(([item_id, quantity]) => ({ item_id, quantity }))
          })(),
        }),
      })
      router.push('/dashboard/inventory/material-issue-requests')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to create material request')
    } finally {
      setRequesting(false)
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
          <CardTitle>Start Shift · {line?.name ?? 'Line'}</CardTitle>
          <CardDescription>Select products from planned tasks for this line/date/shift.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Shift</Label>
              <select className="h-10 rounded-md border px-3 bg-background text-sm w-full" value={shift} onChange={(e) => setShift(e.target.value as ShiftType)}>
                <option value="day">Day</option>
                <option value="night">Night</option>
              </select>
            </div>
          </div>

          <div className="rounded-md border p-3">
            <p className="text-sm font-medium mb-2">Tasks</p>
            {taskItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks allotted for this line/date/shift.</p>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <div className="grid grid-cols-[1fr_140px] bg-muted/40 text-xs font-medium">
                  <div className="px-3 py-2 text-left">Item</div>
                  <div className="px-3 py-2 text-left">Quantity</div>
                </div>
                {taskItems.map((x) => (
                  <div key={x.item_id} className="grid grid-cols-[1fr_140px] border-t text-sm">
                    <div className="px-3 py-2 text-left">{x.sku} - {x.name}</div>
                    <div className="px-3 py-2 text-left">{x.maxQty}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-md border p-3">
            <p className="text-sm font-medium mb-2">Material Issue</p>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_100px] gap-2 items-end mb-3">
              <div>
                <Label>To Produce</Label>
                <select
                  className="h-10 rounded-md border px-3 bg-background text-sm w-full"
                  value={produceItemId}
                  onChange={(e) => setProduceItemId(e.target.value)}
                >
                  <option value="">Select item</option>
                  {taskItems.map((x) => (
                    <option key={x.item_id} value={x.item_id}>
                      {x.sku} - {x.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Qty</Label>
                <Input type="number" min={1} value={produceQty} onChange={(e) => setProduceQty(e.target.value)} />
              </div>
              <Button type="button" onClick={addProduce}>
                Add
              </Button>
            </div>

            {produceEntries.length > 0 && (
              <div className="mb-3 space-y-1">
                {produceEntries.map((p) => (
                  <div key={p.item_id} className="text-sm flex items-center justify-between rounded border px-2 py-1">
                    <span>{p.sku} - {p.name} · {p.qty}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeProduce(p.item_id)}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              {materialGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground">No materials to issue.</p>
              ) : (
                materialGroups.map((g, gi) => (
                  <div key={g.product.item_id} className="rounded-md border p-2">
                    <p className="text-sm font-medium mb-2">{g.product.sku}:</p>
                    <div className="hidden md:grid md:grid-cols-[1fr_120px_140px_160px] gap-2 px-1 text-xs font-medium text-muted-foreground">
                      <p>Item</p>
                      <p>Total Qty</p>
                      <p>Opening Balance</p>
                      <p>Material to request</p>
                    </div>
                    <div className="space-y-1">
                      {g.rows.map((m, idx) => {
                        const requestQty = Math.max(0, Number(m.total_qty || 0) - Number(m.opening_balance || 0))
                        return (
                          <div key={m.item_id} className="grid grid-cols-1 md:grid-cols-[1fr_120px_140px_160px] gap-2 items-center">
                            <p className="text-sm">{m.sku} - {m.name}</p>
                            <Input value={m.total_qty} readOnly />
                            <Input value={m.opening_balance} onChange={(e) => setMaterialOpening(gi, idx, e.target.value)} />
                            <Input value={String(requestQty)} readOnly />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => void requestMaterial()} disabled={requesting || materialGroups.length === 0}>
              {requesting ? 'Requesting…' : 'Request Material'}
            </Button>
            <Button type="button" onClick={() => void startShift()} disabled={saving || produceEntries.length === 0}>
              {saving ? 'Starting…' : 'Start Shift'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
