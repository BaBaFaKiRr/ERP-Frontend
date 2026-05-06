'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Check, ChevronsUpDown, User2 } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type Item = {
  id: string
  sku: string
  name: string
}

type Employee = {
  id: string
  employee_code?: string | null
  full_name?: string | null
}

type ProductionLine = {
  id: string
  name: string
  line_type?: 'production' | 'assembly' | null
  line_incharge?: Employee | null
  production_line_items?: Array<{ item_id: string; items?: Item | null }> | null
  created_at?: string
}

type SalesOrder = {
  id: string
  order_number: string
  status: string
  customer?: { name?: string | null } | null
}

type Shift = {
  id: string
  shift_date: string
  shift_type: 'day' | 'night'
  target_qty: number
  produced_qty: number
  status: 'in_progress' | 'ended' | 'report_submitted'
  product_item_id: string
  product_item?: Item | null
  sales_order?: { id: string; order_number: string } | null
  production_shift_reports?: Array<{
    id: string
    item_produced_id: string
    qty_produced: number
    rejection_qty: number
    production_shift_report_materials?: Array<{ wastage_qty?: number }>
  }>
}

type MaterialIssue = {
  id: string
  item_id: string
  opening_balance: number
  new_issue_qty: number
  total_qty: number
  issued_on: string
  created_at?: string
  item?: Item | null
}

type ShiftLog = {
  id: string
  produced_qty: number
  note?: string | null
  logged_at: string
}

type LineDetailResponse = {
  line: ProductionLine
  active_shift: Shift | null
  pending_report_shift: Shift | null
  focus_shift: Shift | null
  material_issues: MaterialIssue[]
  shift_logs: ShiftLog[]
  summary_rows: Shift[]
  line_materials?: Array<{
    id: string
    item_id: string
    qty_on_hand: number
    bucket?: 'wastage' | string
    item?: { id: string; sku?: string | null; name?: string | null } | null
  }>
  status: 'running' | 'resting'
}

type PlanningTask = {
  id: string
  production_line_id: string
  planned_date: string | null
  shift_type: 'day' | 'night'
  qty: number
  items?: { id: string; sku?: string | null; name?: string | null } | null
  production_lines?: { id: string; name?: string | null } | null
}
type LineReqRow = {
  id: string
  request_number?: string | null
  status: string
  requested_by_name?: string | null
}

export default function ProductionLineDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const [detail, setDetail] = useState<LineDetailResponse | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showStartShift, setShowStartShift] = useState(false)
  const [showTerminateShift, setShowTerminateShift] = useState(false)
  const [terminateReason, setTerminateReason] = useState('Manual terminate')
  const [startShiftForm, setStartShiftForm] = useState({
    product_item_id: '',
    shift_date: '',
    shift_type: 'day' as 'day' | 'night',
    sales_order_id: '',
    target_qty: '',
  })
  const [materialRows, setMaterialRows] = useState<Array<{ item_id: string; opening_balance: string; new_issue_qty: string }>>([
    { item_id: '', opening_balance: '', new_issue_qty: '' },
  ])
  const [changeTotal, setChangeTotal] = useState('')
  const [logProduced, setLogProduced] = useState('')
  const [reportForm, setReportForm] = useState({
    item_produced_id: '',
    qty_produced: '',
  })
  const [reportMaterials, setReportMaterials] = useState<
    Array<{
      item_id: string
      starting_qty: string
      closing_balance_qty: string
      wastage_qty: string
    }>
  >([])
  const [openOrderPicker, setOpenOrderPicker] = useState(false)
  const [openItemPicker, setOpenItemPicker] = useState(false)
  const [planningTasks, setPlanningTasks] = useState<PlanningTask[]>([])
  const [materialIssueRequests, setMaterialIssueRequests] = useState<LineReqRow[]>([])
  const [materialDepositRequests, setMaterialDepositRequests] = useState<LineReqRow[]>([])

  useEffect(() => {
    void load()
  }, [params.id, selectedShiftId])

  useEffect(() => {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hour12: false,
    })
    const parts = Object.fromEntries(formatter.formatToParts(now).map((p) => [p.type, p.value]))
    const date = `${parts.year}-${parts.month}-${parts.day}`
    const hour = Number(parts.hour)
    setStartShiftForm((prev) => ({
      ...prev,
      shift_date: date,
      shift_type: hour >= 8 && hour < 20 ? 'day' : 'night',
    }))
  }, [])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [detailRes, itemsRes, ordersRes, planningRes, mirRes, mdrRes] = await Promise.all([
        erpFetch<{ data: LineDetailResponse }>(
          `/api/production-lines/${params.id}/details${selectedShiftId ? `?shift_id=${selectedShiftId}` : ''}`,
        ),
        erpFetch<{ data: Item[] }>('/api/items?limit=500'),
        erpFetch<{ data: SalesOrder[] }>(`/api/production-lines/${params.id}/open-sales-orders`),
        erpFetch<{ data: PlanningTask[] }>('/api/planning/tasks'),
        erpFetch<{ data: LineReqRow[] }>(`/api/material-issue-requests?production_line_id=${params.id}`),
        erpFetch<{ data: LineReqRow[] }>(`/api/material-deposit-requests?production_line_id=${params.id}`),
      ])
      setDetail(detailRes.data)
      setItems(itemsRes.data ?? [])
      setOrders(ordersRes.data ?? [])
      setPlanningTasks(planningRes.data ?? [])
      setMaterialIssueRequests(mirRes.data ?? [])
      setMaterialDepositRequests(mdrRes.data ?? [])

      const focus = detailRes.data.focus_shift
      if (focus) {
        setChangeTotal(String(focus.target_qty ?? ''))
        setLogProduced('')
        setReportForm({
          item_produced_id: focus.product_item_id,
          qty_produced: String(focus.produced_qty ?? ''),
        })
        const materialIssues = detailRes.data.material_issues ?? []
        setReportMaterials(
          materialIssues.map((m) => ({
            item_id: m.item_id,
            starting_qty: String(m.total_qty ?? 0),
            closing_balance_qty: String(m.total_qty ?? 0),
            wastage_qty: '0',
          })),
        )
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load production line')
    } finally {
      setLoading(false)
    }
  }

  const employeeDisplayName = (employee?: Employee | null) => {
    if (!employee) return 'Unassigned'
    return `${employee.employee_code ?? '-'} - ${employee.full_name ?? 'Employee'}`
  }

  const line = detail?.line ?? null
  const focusShift = detail?.focus_shift ?? null
  const activeShift = detail?.active_shift ?? null
  const pendingReportShift = detail?.pending_report_shift ?? null
  const canStartShift = !activeShift && !pendingReportShift

  const selectedSalesOrderLabel = useMemo(() => {
    const so = orders.find((o) => o.id === startShiftForm.sales_order_id)
    return so ? `${so.order_number} - ${so.customer?.name ?? 'Customer'}` : 'Select sales order'
  }, [orders, startShiftForm.sales_order_id])

  const selectedProductLabel = useMemo(() => {
    const item = items.find((i) => i.id === startShiftForm.product_item_id)
    return item ? `${item.sku} - ${item.name}` : 'Select product item'
  }, [items, startShiftForm.product_item_id])

  // Planning tasks are day-wise scheduling inputs; prefer today's planning context
  // (start-shift defaults) over historical focus shift rows.
  const planningDate = startShiftForm.shift_date
  const planningShift = startShiftForm.shift_type
  const linePlanningTasks = useMemo(
    () =>
      planningTasks.filter(
        (t) =>
          t.production_line_id === params.id &&
          t.planned_date === planningDate &&
          t.shift_type === planningShift,
      ),
    [planningTasks, params.id, planningDate, planningShift],
  )

  const updateMaterialRow = (
    idx: number,
    next: Partial<{ item_id: string; opening_balance: string; new_issue_qty: string }>,
  ) => {
    setMaterialRows((prev) => prev.map((row, i) => (i === idx ? { ...row, ...next } : row)))
  }

  const addMaterialRow = () =>
    setMaterialRows((prev) => [...prev, { item_id: '', opening_balance: '', new_issue_qty: '' }])
  const removeMaterialRow = (idx: number) => {
    setMaterialRows((prev) => prev.filter((_, i) => i !== idx))
  }

  const startShift = async () => {
    if (!line) return
    setSaving(true)
    setError(null)
    try {
      await erpFetch(`/api/production-lines/${line.id}/start-shift`, {
        method: 'POST',
        body: JSON.stringify({
          product_item_id: startShiftForm.product_item_id,
          shift_date: startShiftForm.shift_date || undefined,
          shift_type: startShiftForm.shift_type,
          sales_order_id: startShiftForm.sales_order_id || null,
          target_qty: Number(startShiftForm.target_qty || 0),
          material_issues: materialRows
            .filter((r) => r.item_id)
            .map((r) => ({
              item_id: r.item_id,
              opening_balance: Number(r.opening_balance || 0),
              new_issue_qty: Number(r.new_issue_qty || 0),
            })),
        }),
      })
      setShowStartShift(false)
      setSelectedShiftId(null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start shift')
    } finally {
      setSaving(false)
    }
  }

  const saveChangeTotal = async () => {
    if (!line) return
    setSaving(true)
    setError(null)
    try {
      await erpFetch(`/api/production-lines/${line.id}/change-target`, {
        method: 'POST',
        body: JSON.stringify({ target_qty: Number(changeTotal || 0) }),
      })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save target qty')
    } finally {
      setSaving(false)
    }
  }

  const saveProducedLog = async () => {
    if (!line) return
    setSaving(true)
    setError(null)
    try {
      await erpFetch(`/api/production-lines/${line.id}/log-produced`, {
        method: 'POST',
        body: JSON.stringify({ produced_qty: Number(logProduced || 0) }),
      })
      setLogProduced('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to log produced qty')
    } finally {
      setSaving(false)
    }
  }

  const terminateShift = async () => {
    if (!line) return
    setSaving(true)
    setError(null)
    try {
      await erpFetch(`/api/production-lines/${line.id}/terminate-shift`, {
        method: 'POST',
        body: JSON.stringify({ reason: terminateReason }),
      })
      setShowTerminateShift(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to terminate shift')
    } finally {
      setSaving(false)
    }
  }

  const submitShiftReport = async () => {
    if (!line || !pendingReportShift) return
    setSaving(true)
    setError(null)
    try {
      await erpFetch(`/api/production-lines/${line.id}/submit-shift-report`, {
        method: 'POST',
        body: JSON.stringify({
          shift_id: pendingReportShift.id,
          item_produced_id: reportForm.item_produced_id,
          qty_produced: Number(reportForm.qty_produced || 0),
          materials: reportMaterials.map((m) => ({
            item_id: m.item_id,
            starting_qty: Number(m.starting_qty || 0),
            closing_balance_qty: Number(m.closing_balance_qty || 0),
            wastage_qty: Number(m.wastage_qty || 0),
          })),
        }),
      })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit shift report')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-6 md:p-8 text-sm text-muted-foreground">Loading production line...</div>
  }

  if (!line) {
    return (
      <div className="p-6 md:p-8 space-y-4">
        <p className="text-sm text-red-600">{error || 'Production line not found'}</p>
        <Button asChild variant="outline">
          <Link href="/dashboard/manufacturing/production">Back to Lines</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <Button asChild variant="ghost" className="gap-2 pl-0">
        <Link href="/dashboard/manufacturing/production">
          <ArrowLeft size={16} />
          Back to Lines
        </Link>
      </Button>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Card className="border-border/70 bg-card/70 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-2xl flex flex-wrap items-center gap-2">
                {line.name}
                <Badge variant="outline" className="text-xs font-normal shrink-0">
                  {line.line_type === 'assembly' ? 'Assembly line' : 'Production line'}
                </Badge>
              </CardTitle>
              <CardDescription className="mt-2 flex items-center gap-2">
                <User2 size={14} />
                In-charge: {employeeDisplayName(line.line_incharge)}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-xs">
                <span
                  className={cn(
                    'inline-block h-2 w-2 rounded-full',
                    detail?.status === 'running' ? 'bg-green-500 animate-pulse' : 'bg-red-500',
                  )}
                />
                <Badge variant={detail?.status === 'running' ? 'default' : 'destructive'}>
                  {detail?.status === 'running' ? 'Running' : 'Resting'}
                </Badge>
              </div>
              {canStartShift ? (
                <Button asChild size="sm">
                  <Link href={`/dashboard/manufacturing/production/${params.id}/start-shift`}>Start Shift</Link>
                </Button>
              ) : null}
              {activeShift ? (
                <Button onClick={() => setShowTerminateShift(true)} variant="outline" size="sm" disabled={saving}>
                  Terminate Shift
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Produces</p>
            <div className="flex flex-wrap gap-2">
              {(line.production_line_items ?? []).map((entry) => (
                <Badge key={entry.item_id} variant="secondary">
                  {entry.items?.sku ?? entry.items?.name ?? 'Item'}
                </Badge>
              ))}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Created at: {line.created_at ? new Date(line.created_at).toLocaleString() : '—'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Planned Tasks</CardTitle>
                <CardDescription>
                  {planningDate || '—'} · {planningShift === 'night' ? 'Night shift' : 'Day shift'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {linePlanningTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No planned tasks for this day and shift.</p>
                ) : (
                  <div className="space-y-2">
                    {linePlanningTasks.map((t) => (
                      <div
                        key={t.id}
                        className="rounded-md border px-3 py-2 text-sm flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {t.items?.sku ?? '—'} - {t.items?.name ?? 'Item'}
                          </p>
                        </div>
                        <Badge variant="secondary" className="shrink-0">
                          Qty {Number(t.qty ?? 0)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">Material at hand</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="!bg-white !text-black hover:!bg-white/90 hover:!text-black border-gray-300"
                      asChild
                    >
                    <Link href={`/dashboard/manufacturing/production/${params.id}/request-material`}>Request material</Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="!bg-white !text-black hover:!bg-white/90 hover:!text-black border-gray-300"
                      asChild
                    >
                    <Link href={`/dashboard/manufacturing/production/${params.id}/deposit-store`}>Deposit to store</Link>
                    </Button>
                  </div>
                </div>
                <CardDescription>Issued + carried + produced currently at line.</CardDescription>
              </CardHeader>
              <CardContent>
                {(detail?.line_materials ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No material at hand.</p>
                ) : (
                  <div className="space-y-2">
                    {(detail?.line_materials ?? []).map((m) => (
                      <div key={m.id} className="rounded-md border px-3 py-2 text-sm flex items-center justify-between">
                        <span>
                          {m.item?.sku ?? '—'}
                          {m.bucket === 'wastage' ? ' Wastage' : ''} - {m.item?.name ?? 'Item'}
                        </span>
                        <Badge variant="outline">Qty {Number(m.qty_on_hand ?? 0)}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Material Issue Requests</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {materialIssueRequests.length === 0 ? (
                  <p className="text-muted-foreground">No requests.</p>
                ) : (
                  materialIssueRequests.slice(0, 6).map((r) => (
                    <Link key={r.id} href={`/dashboard/inventory/material-issue-requests/${r.id}`} className="flex items-center justify-between rounded border px-3 py-2 hover:bg-muted/40">
                      <span className="font-mono">{r.request_number ?? `${r.id.slice(0, 8)}…`}</span>
                      <Badge variant="outline">{r.status}</Badge>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Deposit Requests</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {materialDepositRequests.length === 0 ? (
                  <p className="text-muted-foreground">No requests.</p>
                ) : (
                  materialDepositRequests.slice(0, 6).map((r) => (
                    <Link key={r.id} href={`/dashboard/inventory/deposit-requests/${r.id}`} className="flex items-center justify-between rounded border px-3 py-2 hover:bg-muted/40">
                      <span className="font-mono">{r.request_number ?? `${r.id.slice(0, 8)}…`}</span>
                      <Badge variant="outline">{r.status}</Badge>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Dialog open={showStartShift} onOpenChange={setShowStartShift}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Start Shift</DialogTitle>
                <DialogDescription>Create a new shift for this line</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  Product to produce
                  <Popover open={openItemPicker} onOpenChange={setOpenItemPicker}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className="justify-between">
                        {selectedProductLabel}
                        <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[420px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search item..." />
                        <CommandList>
                          <CommandEmpty>No item found.</CommandEmpty>
                          <CommandGroup>
                            {items.map((item) => (
                              <CommandItem
                                key={item.id}
                                value={`${item.sku} ${item.name}`}
                                onSelect={() => {
                                  setStartShiftForm((prev) => ({ ...prev, product_item_id: item.id }))
                                  setOpenItemPicker(false)
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    startShiftForm.product_item_id === item.id ? 'opacity-100' : 'opacity-0',
                                  )}
                                />
                                {item.sku} - {item.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Sales Order
                  <Popover open={openOrderPicker} onOpenChange={setOpenOrderPicker}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className="justify-between">
                        {selectedSalesOrderLabel}
                        <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[420px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search order number or customer..." />
                        <CommandList>
                          <CommandEmpty>No order found.</CommandEmpty>
                          <CommandGroup>
                            {orders.map((so) => (
                              <CommandItem
                                key={so.id}
                                value={`${so.order_number} ${so.customer?.name ?? ''}`}
                                onSelect={() => {
                                  setStartShiftForm((prev) => ({ ...prev, sales_order_id: so.id }))
                                  setOpenOrderPicker(false)
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    startShiftForm.sales_order_id === so.id ? 'opacity-100' : 'opacity-0',
                                  )}
                                />
                                {so.order_number} - {so.customer?.name ?? 'Customer'}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Shift Date
                  <Input
                    type="date"
                    value={startShiftForm.shift_date}
                    onChange={(e) => setStartShiftForm((prev) => ({ ...prev, shift_date: e.target.value }))}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Shift
                  <select
                    className="h-10 rounded-md border px-3 bg-background text-sm"
                    value={startShiftForm.shift_type}
                    onChange={(e) =>
                      setStartShiftForm((prev) => ({ ...prev, shift_type: e.target.value as 'day' | 'night' }))
                    }
                  >
                    <option value="day">Day</option>
                    <option value="night">Night</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm md:col-span-2">
                  Total Qty to Produce
                  <Input
                    type="number"
                    min="0"
                    value={startShiftForm.target_qty}
                    onChange={(e) => setStartShiftForm((prev) => ({ ...prev, target_qty: e.target.value }))}
                  />
                </label>
                </div>

                <div className="space-y-2">
                  <p className="font-medium text-sm">Material Issue</p>
                  {materialRows.map((row, idx) => {
                    const total = Number(row.opening_balance || 0) + Number(row.new_issue_qty || 0)
                    return (
                      <div key={`row-${idx}`} className="grid grid-cols-1 md:grid-cols-5 gap-2">
                        <select
                          className="h-10 rounded-md border px-3 bg-background text-sm"
                          value={row.item_id}
                          onChange={(e) => updateMaterialRow(idx, { item_id: e.target.value })}
                        >
                          <option value="">Select item</option>
                          {items.map((it) => (
                            <option key={it.id} value={it.id}>
                              {it.sku} - {it.name}
                            </option>
                          ))}
                        </select>
                        <Input
                          type="number"
                          min="0"
                          placeholder="Opening Balance"
                          value={row.opening_balance}
                          onChange={(e) => updateMaterialRow(idx, { opening_balance: e.target.value })}
                        />
                        <Input
                          type="number"
                          min="0"
                          placeholder="New Issue"
                          value={row.new_issue_qty}
                          onChange={(e) => updateMaterialRow(idx, { new_issue_qty: e.target.value })}
                        />
                        <Input value={`${Number.isFinite(total) ? total : 0}`} readOnly />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => removeMaterialRow(idx)}
                          disabled={materialRows.length === 1}
                        >
                          Remove
                        </Button>
                      </div>
                    )
                  })}
                  <Button type="button" variant="outline" size="sm" onClick={addMaterialRow}>
                    + Add Material
                  </Button>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowStartShift(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => void startShift()} disabled={saving}>
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showTerminateShift} onOpenChange={setShowTerminateShift}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Terminate Shift</DialogTitle>
                <DialogDescription>Close this active shift and move to report submission.</DialogDescription>
              </DialogHeader>
              <label className="flex flex-col gap-1 text-sm">
                Reason
                <Input value={terminateReason} onChange={(e) => setTerminateReason(e.target.value)} />
              </label>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowTerminateShift(false)}>
                  Cancel
                </Button>
                <Button onClick={() => void terminateShift()} disabled={saving}>
                  {saving ? 'Saving...' : 'Terminate Shift'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {detail?.status !== 'resting' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">In Production</CardTitle>
                  <CardDescription>
                    {focusShift?.product_item
                      ? `${focusShift.product_item.sku} - ${focusShift.product_item.name}`
                      : 'No active/selected shift'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p>Sales Order: {focusShift?.sales_order?.order_number ?? '-'}</p>
                  <div className="flex items-center gap-2">
                    <span>Total QTY: {focusShift?.target_qty ?? '-'}</span>
                    <Input
                      className="w-32"
                      type="number"
                      min="0"
                      placeholder="Change Total"
                      value={changeTotal}
                      onChange={(e) => setChangeTotal(e.target.value)}
                    />
                    <Button size="sm" onClick={() => void saveChangeTotal()} disabled={!activeShift || saving}>
                      Save
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Produced QTY: {focusShift?.produced_qty ?? 0}</span>
                    <Input
                      className="w-32"
                      type="number"
                      min="0"
                      placeholder="Log Produce"
                      value={logProduced}
                      onChange={(e) => setLogProduced(e.target.value)}
                    />
                    <Button size="sm" onClick={() => void saveProducedLog()} disabled={!activeShift || saving}>
                      Save
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Material Issued</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {(detail?.material_issues ?? []).length === 0 ? (
                    <p className="text-muted-foreground">No material issued rows.</p>
                  ) : (
                    (detail?.material_issues ?? []).map((m) => (
                      <div key={m.id} className="flex items-center justify-between border-b pb-1">
                        <span>{m.item ? `${m.item.sku} - ${m.item.name}` : m.item_id}</span>
                        <span>{m.new_issue_qty}</span>
                        <span>
                          Issued on:{' '}
                          {m.created_at ? new Date(m.created_at).toLocaleString() : m.issued_on}
                        </span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}

          {pendingReportShift ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Shift Report (Required)</CardTitle>
                <CardDescription>
                  Submit this before starting another shift ({pendingReportShift.shift_date} {pendingReportShift.shift_type})
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1 text-sm">
                    Item Produced
                    <select
                      className="h-10 rounded-md border px-3 bg-background"
                      value={reportForm.item_produced_id}
                      onChange={(e) => setReportForm((prev) => ({ ...prev, item_produced_id: e.target.value }))}
                    >
                      <option value="">Select item</option>
                      {items.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.sku} - {it.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    Qty Produced
                    <Input
                      type="number"
                      min="0"
                      value={reportForm.qty_produced}
                      onChange={(e) => setReportForm((prev) => ({ ...prev, qty_produced: e.target.value }))}
                    />
                  </label>
                </div>
                <div className="space-y-2">
                  <p className="font-medium text-sm">Raw Material Wastage</p>
                  <div className="hidden md:grid md:grid-cols-4 gap-2 px-1 text-xs font-medium text-muted-foreground">
                    <p>Item</p>
                    <p>Starting Qty</p>
                    <p>Closing Balance</p>
                    <p>Wastage Qty</p>
                  </div>
                  {reportMaterials.map((m, idx) => {
                    const item = items.find((i) => i.id === m.item_id)
                    return (
                      <div key={`${m.item_id}-${idx}`} className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        <Input value={item ? `${item.sku} - ${item.name}` : m.item_id} readOnly />
                        <Input value={m.starting_qty} readOnly />
                        <Input
                          type="number"
                          min="0"
                          placeholder="Closing balance"
                          value={m.closing_balance_qty}
                          onChange={(e) =>
                            setReportMaterials((prev) =>
                              prev.map((row, i) =>
                                i === idx ? { ...row, closing_balance_qty: e.target.value } : row,
                              ),
                            )
                          }
                        />
                        <Input
                          type="number"
                          min="0"
                          placeholder="Wastage qty"
                          value={m.wastage_qty}
                          onChange={(e) =>
                            setReportMaterials((prev) =>
                              prev.map((row, i) => (i === idx ? { ...row, wastage_qty: e.target.value } : row)),
                            )
                          }
                        />
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => void submitShiftReport()} disabled={saving}>
                    Save
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Production Summary</CardTitle>
              <CardDescription>Date, shift, status and produced qty (click row to inspect)</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Shift</th>
                    <th className="py-2 pr-3">Product</th>
                    <th className="py-2 pr-3">Qty Produced</th>
                    <th className="py-2 pr-3">Wastage Qty</th>
                    <th className="py-2 pr-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(detail?.summary_rows ?? []).map((row) => {
                    const wastageQty = Number(
                      (row.production_shift_reports?.[0]?.production_shift_report_materials ?? []).reduce(
                        (sum, material) => sum + Number(material.wastage_qty ?? 0),
                        0,
                      ),
                    )
                    const qtyProduced = Number(row.produced_qty ?? 0)

                    return (
                      <tr
                        key={row.id}
                        className="border-b cursor-pointer hover:bg-muted/40"
                        onClick={() => router.push(`/dashboard/manufacturing/production/${params.id}/report/${row.id}`)}
                      >
                        <td className="py-2 pr-3">{row.shift_date}</td>
                        <td className="py-2 pr-3">{row.shift_type}</td>
                        <td className="py-2 pr-3">
                          {row.product_item ? `${row.product_item.sku} - ${row.product_item.name}` : '-'}
                        </td>
                        <td className="py-2 pr-3">{qtyProduced}</td>
                        <td className="py-2 pr-3">{wastageQty}</td>
                        <td className="py-2 pr-3">{row.status}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  )
}
