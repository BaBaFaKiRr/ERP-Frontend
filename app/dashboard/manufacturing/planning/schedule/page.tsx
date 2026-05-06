'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  max as dateMax,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ChevronLeft, ChevronRight, GripVertical, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { erpFetch } from '@/lib/erp-api'
import { cn } from '@/lib/utils'

type ShiftType = 'day' | 'night'

type LineOption = {
  id: string
  name: string
}

type WorkOrderLine = {
  item_id: string
  qty_ordered: number
  qty_produced?: number | null
  items?: {
    id: string
    sku?: string | null
    name?: string | null
    item_type?: string | null
  } | null
}

type WorkOrder = {
  id: string
  status: string
  work_order_lines?: WorkOrderLine[] | null
}

type BomResponse = {
  id: string
  output_quantity?: number | null
  bom_lines?: Array<{
    quantity_per: number
    items?: {
      id: string
      sku?: string | null
      name?: string | null
      item_type?: string | null
    } | null
  }>
}

type Requirement = {
  item_id: string
  sku: string
  name: string
  qty_initial: number
  qty_remaining: number
}

type TaskObj = {
  id: string
  item_id: string
  item_label: string
  qty: number
  line_id: string
  line_name: string
  shift: ShiftType
  planned_date: string | null
}

type PlanningTaskApi = {
  id: string
  item_id: string
  production_line_id: string
  shift_type: ShiftType
  qty: number
  planned_date: string | null
  items?: { id: string; sku?: string | null; name?: string | null } | null
  production_lines?: { id: string; name?: string | null } | null
}

const SHIFT_LABEL: Record<ShiftType, string> = { day: 'Day', night: 'Night' }
const WEEK_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const CLOSED_WO = new Set(['completed', 'cancelled', 'deleted'])

function ymd(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

function fmtQty(n: number): string {
  return Math.round(n * 1000) / 1000 === Math.round(n)
    ? Math.round(n).toLocaleString('en-IN')
    : (Math.round(n * 1000) / 1000).toLocaleString('en-IN', { maximumFractionDigits: 3 })
}

export default function SchedulePlanningPage() {
  const today = useMemo(() => new Date(), [])
  const minMonth = useMemo(() => startOfMonth(today), [today])
  const [monthCursor, setMonthCursor] = useState<Date>(minMonth)
  const [selectedDate, setSelectedDate] = useState<Date>(today)
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [lines, setLines] = useState<LineOption[]>([])
  const [loadingReq, setLoadingReq] = useState(true)

  const [itemId, setItemId] = useState('')
  const [qtyInput, setQtyInput] = useState('')
  const [lineId, setLineId] = useState('')
  const [shift, setShift] = useState<ShiftType>('day')

  const [tasks, setTasks] = useState<TaskObj[]>([])

  const monthStart = startOfMonth(monthCursor)
  const monthEnd = endOfMonth(monthCursor)
  const gridStart = startOfWeek(monthStart)
  const gridEnd = endOfWeek(monthEnd)
  const calendarDays = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const selectedKey = ymd(selectedDate)
  const pendingTask = useMemo(() => tasks.find((t) => t.planned_date == null) ?? null, [tasks])
  const tasksByDate = useMemo(() => {
    const out: Record<string, TaskObj[]> = {}
    for (const t of tasks) {
      if (!t.planned_date) continue
      if (!out[t.planned_date]) out[t.planned_date] = []
      out[t.planned_date].push(t)
    }
    return out
  }, [tasks])
  const selectedDateTasks = tasksByDate[selectedKey] ?? []

  useEffect(() => {
    void (async () => {
      setLoadingReq(true)
      try {
        const [woRes, linesRes, taskRes] = await Promise.all([
          erpFetch<{ data: WorkOrder[] }>('/api/work-orders'),
          erpFetch<{ data: Array<{ id: string; name: string }> }>('/api/production-lines'),
          erpFetch<{ data: PlanningTaskApi[] }>('/api/planning/tasks'),
        ])
        const openWos = (woRes.data ?? []).filter((w) => !CLOSED_WO.has(String(w.status ?? '')))
        const lineOpts = (linesRes.data ?? []).map((l) => ({ id: l.id, name: l.name }))
        setLines(lineOpts)
        if (lineOpts.length > 0) setLineId((prev) => prev || lineOpts[0].id)

        const reqMap = new Map<string, { sku: string; name: string; qty: number }>()
        const fgNeeds = new Map<
          string,
          { sku: string; name: string; qty: number; item_type: string | null }
        >()

        for (const wo of openWos) {
          for (const wl of wo.work_order_lines ?? []) {
            const qtyOrd = Number(wl.qty_ordered ?? 0)
            const qtyProd = Number(wl.qty_produced ?? 0)
            const outstanding = Math.max(0, qtyOrd - qtyProd)
            if (outstanding <= 0) continue
            const item = wl.items
            if (!item?.id) continue
            const itemType = (item.item_type ?? '').toLowerCase()
            if (itemType !== 'finished_good' && itemType !== 'semi_finished') continue

            const key = String(item.id)
            const prev = fgNeeds.get(key)
            fgNeeds.set(key, {
              sku: String(item.sku ?? '—'),
              name: String(item.name ?? 'Item'),
              qty: (prev?.qty ?? 0) + outstanding,
              item_type: item.item_type ?? null,
            })
          }
        }

        // Add all FG/SFG in open WOs.
        for (const [k, v] of fgNeeds) {
          const prev = reqMap.get(k)
          reqMap.set(k, {
            sku: v.sku,
            name: v.name,
            qty: (prev?.qty ?? 0) + v.qty,
          })
        }

        // Add direct semi-finished components from FG/SFG BOMs.
        const bomByParent = await Promise.all(
          [...fgNeeds.entries()].map(async ([parentId, meta]) => {
            try {
              const r = await erpFetch<{ data: BomResponse }>(`/api/bom/${parentId}`)
              return { parentId, parentQty: meta.qty, bom: r.data }
            } catch {
              return { parentId, parentQty: meta.qty, bom: null as BomResponse | null }
            }
          }),
        )

        for (const row of bomByParent) {
          if (!row.bom?.bom_lines?.length) continue
          const outQ = Number(row.bom.output_quantity ?? 1) || 1
          for (const bl of row.bom.bom_lines) {
            const comp = bl.items
            if (!comp?.id) continue
            if ((comp.item_type ?? '').toLowerCase() !== 'semi_finished') continue
            const qty = (Number(bl.quantity_per ?? 0) / outQ) * row.parentQty
            if (qty <= 0) continue
            const key = String(comp.id)
            const prev = reqMap.get(key)
            reqMap.set(key, {
              sku: String(comp.sku ?? '—'),
              name: String(comp.name ?? 'Item'),
              qty: (prev?.qty ?? 0) + qty,
            })
          }
        }

        let reqRows: Requirement[] = [...reqMap.entries()]
          .map(([item_id, v]) => ({
            item_id,
            sku: v.sku,
            name: v.name,
            qty_initial: v.qty,
            qty_remaining: v.qty,
          }))

        const loadedTasks: TaskObj[] = (taskRes.data ?? []).map((t) => ({
          id: t.id,
          item_id: t.item_id,
          item_label: `${t.items?.sku ?? '—'} - ${t.items?.name ?? 'Item'}`,
          qty: Number(t.qty ?? 0),
          line_id: t.production_line_id,
          line_name: t.production_lines?.name ?? 'Line',
          shift: t.shift_type,
          planned_date: t.planned_date,
        }))
        setTasks(loadedTasks)

        // Deplete remaining requirements by all persisted tasks.
        const consumed = new Map<string, number>()
        for (const t of loadedTasks) {
          consumed.set(t.item_id, (consumed.get(t.item_id) ?? 0) + Number(t.qty))
        }
        reqRows = reqRows.map((r) => ({
          ...r,
          qty_remaining: Math.max(0, Number(r.qty_remaining) - Number(consumed.get(r.item_id) ?? 0)),
        }))

        setRequirements(reqRows)
      } finally {
        setLoadingReq(false)
      }
    })()
  }, [])

  const sortedRequirements = useMemo(() => {
    return [...requirements].sort((a, b) => {
      const az = a.qty_remaining <= 0 ? 1 : 0
      const bz = b.qty_remaining <= 0 ? 1 : 0
      if (az !== bz) return az - bz
      return a.sku.localeCompare(b.sku)
    })
  }, [requirements])

  const selectedRequirement = requirements.find((r) => r.item_id === itemId) ?? null
  const maxQty = Number(selectedRequirement?.qty_remaining ?? 0)

  const canCreate = !pendingTask && !!itemId && !!lineId && Number(qtyInput) > 0 && Number(qtyInput) <= maxQty && maxQty > 0

  const monthCanGoPrev = monthCursor.getTime() > minMonth.getTime()

  const createTask = async () => {
    if (!canCreate || !selectedRequirement) return
    const qty = Number(qtyInput)
    const selectedLine = lines.find((l) => l.id === lineId)
    if (!selectedLine) return
    try {
      const res = await erpFetch<{ data: PlanningTaskApi }>('/api/planning/tasks', {
        method: 'POST',
        body: JSON.stringify({
          item_id: selectedRequirement.item_id,
          production_line_id: selectedLine.id,
          shift_type: shift,
          qty,
          planned_date: null,
        }),
      })
      const t = res.data
      setTasks((prev) => [
        ...prev,
        {
          id: t.id,
          item_id: t.item_id,
          item_label: `${t.items?.sku ?? '—'} - ${t.items?.name ?? 'Item'}`,
          qty: Number(t.qty ?? 0),
          line_id: t.production_line_id,
          line_name: t.production_lines?.name ?? selectedLine.name,
          shift: t.shift_type,
          planned_date: t.planned_date,
        },
      ])
      setRequirements((prev) =>
        prev.map((r) =>
          r.item_id === selectedRequirement.item_id
            ? { ...r, qty_remaining: Math.max(0, r.qty_remaining - qty) }
            : r,
        ),
      )
      setQtyInput('')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to create planning task')
    }
  }

  const restoreRequirementQty = (task: TaskObj) => {
    setRequirements((prev) =>
      prev.map((r) =>
        r.item_id === task.item_id ? { ...r, qty_remaining: r.qty_remaining + task.qty } : r,
      ),
    )
  }

  const deletePendingTask = async () => {
    if (!pendingTask) return
    try {
      await erpFetch(`/api/planning/tasks/${pendingTask.id}`, { method: 'DELETE' })
      restoreRequirementQty(pendingTask)
      setTasks((prev) => prev.filter((t) => t.id !== pendingTask.id))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete task')
    }
  }

  const deleteAssignedTask = async (dateKey: string, taskId: string) => {
    const task = (tasksByDate[dateKey] ?? []).find((t) => t.id === taskId)
    if (!task) return
    try {
      await erpFetch(`/api/planning/tasks/${task.id}`, { method: 'DELETE' })
      setTasks((prev) => prev.filter((t) => t.id !== task.id))
      restoreRequirementQty(task)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete task')
    }
  }

  const onDragStartPending = (task: TaskObj) => (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('application/task-source', 'pending')
    e.dataTransfer.setData('application/task-id', task.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const onDragStartAssigned =
    (dateKey: string, taskId: string) => (e: React.DragEvent<HTMLDivElement>) => {
      e.dataTransfer.setData('application/task-source', dateKey)
      e.dataTransfer.setData('application/task-id', taskId)
      e.dataTransfer.effectAllowed = 'move'
    }

  const moveTaskToDate = async (targetDateKey: string, source: string, taskId: string) => {
    if (source === 'pending') {
      if (!pendingTask || pendingTask.id !== taskId) return
      try {
        await erpFetch(`/api/planning/tasks/${pendingTask.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ planned_date: targetDateKey }),
        })
        setTasks((prev) =>
          prev.map((t) => (t.id === pendingTask.id ? { ...t, planned_date: targetDateKey } : t)),
        )
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Failed to assign task')
      }
      return
    }
    const sourceTasks = tasksByDate[source] ?? []
    const task = sourceTasks.find((t) => t.id === taskId)
    if (!task) return
    if (source === targetDateKey) return
    try {
      await erpFetch(`/api/planning/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ planned_date: targetDateKey }),
      })
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, planned_date: targetDateKey } : t)))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to move task')
    }
  }

  const onDropToDate = (targetDateKey: string) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const source = e.dataTransfer.getData('application/task-source')
    const taskId = e.dataTransfer.getData('application/task-id')
    if (!source || !taskId) return
    void moveTaskToDate(targetDateKey, source, taskId)
  }

  const dateTaskCount = (dateKey: string) => (tasksByDate[dateKey] ?? []).length

  return (
    <div className="p-6 md:p-8">
      <div className="grid grid-cols-1 xl:grid-cols-[7fr_3fr] gap-5">
        <Card className="border-border/70 bg-card/80">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={!monthCanGoPrev}
                  onClick={() =>
                    monthCanGoPrev && setMonthCursor((d) => dateMax([minMonth, addMonths(d, -1)]))
                  }
                  aria-label="Previous month"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <div className="min-w-32 text-center text-sm font-medium">
                  {format(monthCursor, 'MMMM yyyy')}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setMonthCursor((d) => addMonths(d, 1))}
                  aria-label="Next month"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
              <Button asChild variant="outline">
                <Link href="/dashboard/manufacturing/planning">Back</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-7 border rounded-lg overflow-hidden bg-background/60">
              {WEEK_LABELS.map((d) => (
                <div
                  key={d}
                  className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b"
                >
                  {d}
                </div>
              ))}
              {calendarDays.map((d) => {
                const key = ymd(d)
                const inMonth = isSameMonth(d, monthCursor)
                const selected = isSameDay(d, selectedDate)
                const count = dateTaskCount(key)
                return (
                  <div
                    key={key}
                    className={cn(
                      'h-24 border-b border-r p-2 transition-colors',
                      !inMonth && 'bg-muted/30 text-muted-foreground',
                      selected && 'bg-primary/10',
                    )}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={onDropToDate(key)}
                  >
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => setSelectedDate(d)}
                    >
                      <div className="text-sm font-semibold">{format(d, 'd')}</div>
                    </button>
                    {count > 0 && (
                      <div className="mt-1 text-[11px] text-primary font-medium">{count} task(s)</div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="rounded-xl border p-3 bg-background/70">
              <p className="text-sm font-medium mb-2">{format(selectedDate, 'dd MMM yyyy')}</p>
              <p className="text-xs text-muted-foreground mb-3">Production</p>
              {selectedDateTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tasks assigned to this date.</p>
              ) : (
                <div className="space-y-2">
                  {selectedDateTasks.map((t) => (
                    <div
                      key={t.id}
                      className="rounded-md border px-3 py-2 text-sm flex items-center justify-between gap-2 bg-card"
                      draggable
                      onDragStart={onDragStartAssigned(selectedKey, t.id)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <GripVertical className="size-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{t.line_name}</p>
                          <p className="text-muted-foreground truncate">
                            {SHIFT_LABEL[t.shift]} · {t.item_label} · {fmtQty(t.qty)} pcs
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive"
                        onClick={() => deleteAssignedTask(selectedKey, t.id)}
                        title="Delete task"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle>Production Requirements</CardTitle>
            <CardDescription>
              Pending WO demand (finished and semi-finished goods).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-72 overflow-auto rounded-lg border bg-background/60 p-2">
              {loadingReq ? (
                <p className="text-sm text-muted-foreground p-2">Loading requirements…</p>
              ) : sortedRequirements.length === 0 ? (
                <p className="text-sm text-muted-foreground p-2">No pending requirements.</p>
              ) : (
                <div className="space-y-1.5">
                  {sortedRequirements.map((r) => {
                    const depleted = r.qty_remaining <= 0
                    return (
                      <div
                        key={r.item_id}
                        className={cn(
                          'rounded-md border px-2 py-1.5 text-sm flex items-center justify-between gap-2',
                          depleted && 'opacity-45',
                        )}
                      >
                        <Link
                          href={`/dashboard/inventory/items/${r.item_id}`}
                          className="font-medium hover:underline truncate"
                        >
                          {r.sku}
                        </Link>
                        <span className="tabular-nums">{fmtQty(r.qty_remaining)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="rounded-lg border p-3 bg-background/60 space-y-3">
              <h3 className="text-sm font-medium">Create task</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Item</Label>
                  <Select value={itemId} onValueChange={setItemId} disabled={!!pendingTask}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select item" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortedRequirements
                        .filter((r) => r.qty_remaining > 0)
                        .map((r) => (
                          <SelectItem key={r.item_id} value={r.item_id}>
                            {r.sku} ({fmtQty(r.qty_remaining)})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Qty</Label>
                  <Input
                    type="number"
                    min={1}
                    max={maxQty || undefined}
                    value={qtyInput}
                    onChange={(e) => setQtyInput(e.target.value)}
                    disabled={!!pendingTask || !itemId}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Line</Label>
                  <Select value={lineId} onValueChange={setLineId} disabled={!!pendingTask}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select line" />
                    </SelectTrigger>
                    <SelectContent>
                      {lines.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Shift</Label>
                  <Select
                    value={shift}
                    onValueChange={(v) => setShift(v as ShiftType)}
                    disabled={!!pendingTask}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Day</SelectItem>
                      <SelectItem value="night">Night</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                type="button"
                className="w-full"
                disabled={!canCreate}
                onClick={createTask}
              >
                Create
              </Button>
              {pendingTask && (
                <div className="rounded-md border px-3 py-2 text-sm bg-card">
                  <p className="text-xs text-muted-foreground mb-1">
                    Task menu (assign this task to a date before creating another)
                  </p>
                  <div
                    className="flex items-center justify-between gap-2"
                    draggable
                    onDragStart={onDragStartPending(pendingTask)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <GripVertical className="size-4 text-muted-foreground shrink-0" />
                      <p className="truncate">
                        {pendingTask.line_name} · {SHIFT_LABEL[pendingTask.shift]} ·{' '}
                        {pendingTask.item_label} · {fmtQty(pendingTask.qty)} pcs
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive"
                      onClick={deletePendingTask}
                      title="Delete task"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
