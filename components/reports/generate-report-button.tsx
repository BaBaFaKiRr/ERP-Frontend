'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { FileSpreadsheet, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { downloadBlob, erpFetch, erpFetchBlob } from '@/lib/erp-api'
import {
  DATE_PRESET_OPTIONS,
  REPORT_CONFIGS,
  STOCK_PURPOSE_OPTIONS,
  type DatePreset,
  type GenerateReportPayload,
  type ReportGroupBy,
  type ReportType,
} from '@/lib/report-config'

type EntityOption = { id: string; label: string }

type GenerateReportButtonProps = {
  reportType: ReportType
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}

function defaultGroupBy(reportType: ReportType): ReportGroupBy {
  const config = REPORT_CONFIGS[reportType]
  return config.groupByOptions[0]?.value ?? 'summary'
}

export function GenerateReportButton({
  reportType,
  variant = 'outline',
  size = 'default',
  className,
}: GenerateReportButtonProps) {
  const config = REPORT_CONFIGS[reportType]
  const [open, setOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [datePreset, setDatePreset] = useState<DatePreset>('last_month')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [groupBy, setGroupBy] = useState<ReportGroupBy>(defaultGroupBy(reportType))
  const [status, setStatus] = useState('all')
  const [entityId, setEntityId] = useState('all')
  const [department, setDepartment] = useState('')
  const [purpose, setPurpose] = useState('all')
  const [entityOptions, setEntityOptions] = useState<EntityOption[]>([])
  const [departments, setDepartments] = useState<string[]>([])
  const [loadingOptions, setLoadingOptions] = useState(false)

  const entityFilter = config.entityFilter

  const resetForm = useCallback(() => {
    setDatePreset('last_month')
    setFromDate('')
    setToDate('')
    setGroupBy(defaultGroupBy(reportType))
    setStatus('all')
    setEntityId('all')
    setDepartment('')
    setPurpose('all')
  }, [reportType])

  useEffect(() => {
    if (!open) return
    resetForm()
  }, [open, reportType, resetForm])

  useEffect(() => {
    if (!open || !entityFilter) return

    void (async () => {
      setLoadingOptions(true)
      try {
        if (entityFilter === 'customer') {
          const res = await erpFetch<{ data: Array<{ id: string; name: string }> }>('/api/customers')
          setEntityOptions(
            (res.data ?? []).map((c) => ({ id: c.id, label: c.name })).sort((a, b) => a.label.localeCompare(b.label)),
          )
        } else if (entityFilter === 'supplier') {
          const res = await erpFetch<{ data: Array<{ id: string; name: string; supplier_code?: string }> }>(
            '/api/suppliers',
          )
          setEntityOptions(
            (res.data ?? [])
              .map((s) => ({
                id: s.id,
                label: s.supplier_code ? `${s.supplier_code} — ${s.name}` : s.name,
              }))
              .sort((a, b) => a.label.localeCompare(b.label)),
          )
        } else if (entityFilter === 'employee') {
          const res = await erpFetch<{
            data: Array<{ id: string; full_name?: string; employee_code?: string; department?: string }>
          }>('/api/employees')
          const rows = res.data ?? []
          setEntityOptions(
            rows
              .map((e) => ({
                id: e.id,
                label: e.full_name
                  ? `${e.employee_code ?? ''} — ${e.full_name}`.replace(/^ — /, '')
                  : e.employee_code ?? e.id,
              }))
              .sort((a, b) => a.label.localeCompare(b.label)),
          )
          const depts = [...new Set(rows.map((e) => e.department?.trim()).filter(Boolean) as string[])].sort()
          setDepartments(depts)
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to load filter options')
      } finally {
        setLoadingOptions(false)
      }
    })()
  }, [open, entityFilter])

  const customDateInvalid = useMemo(() => {
    if (datePreset !== 'custom') return false
    if (!fromDate || !toDate) return true
    return fromDate > toDate
  }, [datePreset, fromDate, toDate])

  const buildPayload = (): GenerateReportPayload => {
    const payload: GenerateReportPayload = {
      reportType,
      groupBy,
      datePreset,
      status: status !== 'all' ? status : undefined,
    }

    if (datePreset === 'custom') {
      payload.fromDate = fromDate
      payload.toDate = toDate
    }

    if (entityFilter === 'customer' && entityId !== 'all') payload.customerId = entityId
    if (entityFilter === 'supplier' && entityId !== 'all') payload.supplierId = entityId
    if (entityFilter === 'employee') {
      if (entityId !== 'all') payload.employeeId = entityId
      if (department.trim()) payload.department = department.trim()
    }
    if (entityFilter === 'purpose' && purpose !== 'all') payload.purpose = purpose

    return payload
  }

  const handleGenerate = async () => {
    if (customDateInvalid) {
      toast.error('Please select a valid custom date range')
      return
    }

    setGenerating(true)
    try {
      const { blob, filename } = await erpFetchBlob('/api/reports/generate', {
        method: 'POST',
        body: buildPayload(),
      })
      downloadBlob(blob, filename ?? `${reportType}-report.xlsx`)
      toast.success(`${config.label} report downloaded`)
      setOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Report generation failed')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <FileSpreadsheet className="size-4 mr-2" />
          Generate Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate {config.label} Report</DialogTitle>
          <DialogDescription>
            Download an Excel (.xlsx) report with filters and date range applied.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="date-preset">Date range</Label>
            <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
              <SelectTrigger id="date-preset">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_PRESET_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                    {opt.hint ? ` (${opt.hint})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {datePreset === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="from-date">From</Label>
                <Input id="from-date" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="to-date">To</Label>
                <Input id="to-date" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
            </div>
          )}

          {config.groupByOptions.length > 1 && (
            <div className="grid gap-2">
              <Label htmlFor="group-by">Report view</Label>
              <Select value={groupBy} onValueChange={(v) => setGroupBy(v as ReportGroupBy)}>
                <SelectTrigger id="group-by">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {config.groupByOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {config.statusOptions && (
            <div className="grid gap-2">
              <Label htmlFor="status-filter">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {config.statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {entityFilter === 'customer' || entityFilter === 'supplier' ? (
            <div className="grid gap-2">
              <Label>{entityFilter === 'customer' ? 'Customer' : 'Supplier'}</Label>
              <Select value={entityId} onValueChange={setEntityId} disabled={loadingOptions}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingOptions ? 'Loading…' : 'All'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All {entityFilter === 'customer' ? 'customers' : 'suppliers'}</SelectItem>
                  {entityOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {entityFilter === 'employee' && (
            <>
              <div className="grid gap-2">
                <Label>Employee</Label>
                <Select value={entityId} onValueChange={setEntityId} disabled={loadingOptions}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingOptions ? 'Loading…' : 'All employees'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All employees</SelectItem>
                    {entityOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {departments.length > 0 && (
                <div className="grid gap-2">
                  <Label htmlFor="department">Department</Label>
                  <Select
                    value={department || 'all'}
                    onValueChange={(v) => setDepartment(v === 'all' ? '' : v)}
                  >
                    <SelectTrigger id="department">
                      <SelectValue placeholder="All departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All departments</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          {entityFilter === 'purpose' && (
            <div className="grid gap-2">
              <Label>Purpose</Label>
              <Select value={purpose} onValueChange={setPurpose}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STOCK_PURPOSE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={generating}>
            Cancel
          </Button>
          <Button onClick={() => void handleGenerate()} disabled={generating || customDateInvalid}>
            {generating ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <FileSpreadsheet className="size-4 mr-2" />
                Download XLSX
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
