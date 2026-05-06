'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  addMonths,
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { erpFetch } from '@/lib/erp-api'
import { cn } from '@/lib/utils'

type ShiftType = 'day' | 'night'

type ShiftPlan = {
  id: string
  shift: ShiftType
  line: string
  item: string
  qty: number
  producedQtyLineShift: number
}

type PlanningViewMode = 'month' | 'day'

type PlanningTaskApi = {
  id: string
  planned_date: string | null
  shift_type: ShiftType
  qty: number
  produced_qty_line_shift?: number
  items?: { sku?: string | null; name?: string | null } | null
  production_lines?: { name?: string | null } | null
}

const WEEK_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

function ymd(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export default function ManufacturingPlanningPage() {
  const today = useMemo(() => new Date(), [])
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(today))
  const [selectedDate, setSelectedDate] = useState<Date>(today)
  const [viewMode, setViewMode] = useState<PlanningViewMode>('month')
  const [plansByDate, setPlansByDate] = useState<Map<string, ShiftPlan[]>>(new Map())

  const monthStart = startOfMonth(monthCursor)
  const monthEnd = endOfMonth(monthCursor)
  const gridStart = startOfWeek(monthStart)
  const gridEnd = endOfWeek(monthEnd)
  const calendarDays = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const selectedKey = ymd(selectedDate)
  const selectedPlans = plansByDate.get(selectedKey) ?? []

  const dayShiftPlans = selectedPlans.filter((p) => p.shift === 'day')
  const nightShiftPlans = selectedPlans.filter((p) => p.shift === 'night')
  useEffect(() => {
    void (async () => {
      try {
        const res = await erpFetch<{ data: PlanningTaskApi[] }>('/api/planning/tasks')
        const byDate = new Map<string, ShiftPlan[]>()
        for (const row of res.data ?? []) {
          if (!row.planned_date) continue
          const arr = byDate.get(row.planned_date) ?? []
          arr.push({
            id: row.id,
            shift: row.shift_type,
            line: row.production_lines?.name ?? 'Line',
            item: `${row.items?.sku ?? '—'} - ${row.items?.name ?? 'Item'}`,
            qty: Number(row.qty ?? 0),
            producedQtyLineShift: Number(row.produced_qty_line_shift ?? 0),
          })
          byDate.set(row.planned_date, arr)
        }
        setPlansByDate(byDate)
      } catch {
        setPlansByDate(new Map())
      }
    })()
  }, [])
  const moveSelectedDate = (delta: number) => {
    const next = addDays(selectedDate, delta)
    setSelectedDate(next)
    setMonthCursor(startOfMonth(next))
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      {viewMode === 'month' && (
        <Card className="border-border/70 bg-card/80">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <CardTitle>Production Schedule</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" asChild>
                  <Link href="/dashboard/manufacturing/planning/schedule">Plan</Link>
                </Button>
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setMonthCursor((d) => addMonths(d, -1))}
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
                </>
              </div>
            </div>
          </CardHeader>

          <CardContent>
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
                const plans = plansByDate.get(key) ?? []
                const hasPlan = plans.length > 0
                const selected = isSameDay(d, selectedDate)
                const inMonth = isSameMonth(d, monthCursor)
                const isToday = isSameDay(d, today)
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSelectedDate(d)
                      setViewMode('day')
                    }}
                    className={cn(
                      'h-28 border-b border-r p-2 text-left align-top transition-colors',
                      'hover:bg-accent/60 focus:outline-none focus:ring-2 focus:ring-ring',
                      !inMonth && 'bg-muted/30 text-muted-foreground',
                      selected && 'bg-primary/10',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold">{format(d, 'd')}</div>
                      {isToday ? (
                        <span className="inline-flex items-center rounded-full border border-primary/40 bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                          Today
                        </span>
                      ) : null}
                    </div>
                    {hasPlan && (
                      <div className="mt-2 space-y-1">
                        <Badge variant="secondary" className="text-[10px]">
                          {plans.filter((p) => p.shift === 'day').length} Day shift
                        </Badge>
                        {plans.some((p) => p.shift === 'night') && (
                          <Badge variant="outline" className="text-[10px]">
                            {plans.filter((p) => p.shift === 'night').length} Night shift
                          </Badge>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {viewMode === 'day' && (
        <Card className="border-border/70 bg-card/80">
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setViewMode('month')}
              >
                Back
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => moveSelectedDate(-1)}
                  aria-label="Previous date"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => moveSelectedDate(1)}
                  aria-label="Next date"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center min-w-10">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                  {format(selectedDate, 'EEE')}
                </span>
                <span className="mt-1 inline-flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-base font-semibold">
                  {format(selectedDate, 'd')}
                </span>
              </div>
              <div>
                <CardTitle>{format(selectedDate, 'MMMM d, yyyy')}</CardTitle>
              </div>
            </div>
            <div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border overflow-hidden bg-background/70">
              <div className="grid grid-cols-[140px_1fr] min-h-[420px]">
                <div className="border-r bg-muted/35">
                  <div className="h-[210px] border-b px-4 py-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Shift</p>
                    <p className="font-medium">Day shift</p>
                  </div>
                  <div className="h-[210px] px-4 py-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Shift</p>
                    <p className="font-medium">Night shift</p>
                  </div>
                </div>

                <div>
                  <div className="h-[210px] border-b p-3 space-y-2">
                    {dayShiftPlans.length === 0 ? (
                      <div className="h-full grid place-items-center text-sm text-muted-foreground">
                        No day shift plan
                      </div>
                    ) : (
                      dayShiftPlans.map((p, i) => (
                        (() => {
                          const diff = Number(p.producedQtyLineShift ?? 0) - Number(p.qty ?? 0)
                          return (
                        <div
                          key={`day-${i}`}
                          className="rounded-md border border-emerald-400/40 bg-emerald-500/15 px-3 py-2 text-sm"
                        >
                          <p className="font-medium">{p.line}</p>
                          <p className="text-muted-foreground">{p.item}</p>
                          <p className="text-xs mt-1">Qty planned: {p.qty.toLocaleString('en-IN')}</p>
                          <p className="text-xs">Qty produced: {p.producedQtyLineShift.toLocaleString('en-IN')}</p>
                          <p
                            className={cn(
                              'text-xs',
                              diff < 0 ? 'text-red-400' : diff > 0 ? 'text-green-800' : 'text-muted-foreground',
                            )}
                          >
                            {diff < 0
                              ? `Backlog: ${Math.abs(diff).toLocaleString('en-IN')}`
                              : diff > 0
                                ? `Excess: ${diff.toLocaleString('en-IN')}`
                                : 'On target'}
                          </p>
                        </div>
                          )
                        })()
                      ))
                    )}
                  </div>

                  <div className="h-[210px] p-3 space-y-2">
                    {nightShiftPlans.length === 0 ? (
                      <div className="h-full grid place-items-center text-sm text-muted-foreground">
                        No night shift plan
                      </div>
                    ) : (
                      nightShiftPlans.map((p, i) => (
                        (() => {
                          const diff = Number(p.producedQtyLineShift ?? 0) - Number(p.qty ?? 0)
                          return (
                        <div
                          key={`night-${i}`}
                          className="rounded-md border border-indigo-400/40 bg-indigo-500/15 px-3 py-2 text-sm"
                        >
                          <p className="font-medium">{p.line}</p>
                          <p className="text-muted-foreground">{p.item}</p>
                          <p className="text-xs mt-1">Qty planned: {p.qty.toLocaleString('en-IN')}</p>
                          <p className="text-xs">Qty produced: {p.producedQtyLineShift.toLocaleString('en-IN')}</p>
                          <p
                            className={cn(
                              'text-xs',
                              diff < 0 ? 'text-red-400' : diff > 0 ? 'text-green-800' : 'text-muted-foreground',
                            )}
                          >
                            {diff < 0
                              ? `Backlog: ${Math.abs(diff).toLocaleString('en-IN')}`
                              : diff > 0
                                ? `Excess: ${diff.toLocaleString('en-IN')}`
                                : 'On target'}
                          </p>
                        </div>
                          )
                        })()
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
