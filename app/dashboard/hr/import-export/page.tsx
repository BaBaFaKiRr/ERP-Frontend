'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Download } from 'lucide-react'
import { erpFetch, erpFetchBlob, downloadBlob } from '@/lib/erp-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const DEPARTMENTS = [
  'Sales',
  'Production',
  'Quality',
  'Store',
  'Dispatch',
  'Accounts',
  'Impex',
  'General Staff',
  'Human Resources',
  'Management',
] as const

type DataAction = 'import' | 'export'

type EmployeeConstraints = {
  department: string
  status: 'all' | 'active_employee' | 'deboarded'
}

type OperationRow = {
  id: string
  action: DataAction
  segment: string
  row_count?: number | null
  file_name?: string | null
  status: string
  error_message?: string | null
  created_at: string
  employee?: { id: string; full_name?: string | null; employee_code?: string | null } | null
  performer?: {
    id: string
    first_name?: string | null
    last_name?: string | null
    email?: string | null
  } | null
}

const EMPTY_EMPLOYEE_CONSTRAINTS: EmployeeConstraints = {
  department: '',
  status: 'all',
}

function FieldLabel({
  htmlFor,
  children,
  required = false,
}: {
  htmlFor?: string
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <Label htmlFor={htmlFor} className="mb-1 block text-sm font-medium">
      {children}
      {required ? ' *' : null}
    </Label>
  )
}

function performerLabel(row: OperationRow): string {
  if (row.employee?.full_name?.trim()) {
    const code = row.employee.employee_code ? ` (${row.employee.employee_code})` : ''
    return `${row.employee.full_name}${code}`
  }
  const p = row.performer
  if (!p) return '—'
  const name = [p.first_name, p.last_name].filter(Boolean).join(' ').trim()
  return name || p.email || '—'
}

function performerHref(row: OperationRow): string | null {
  if (row.employee?.id) return `/dashboard/hr/${row.employee.id}`
  return null
}

function formatWhen(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString()
}

export default function ImportExportEmployeesPage() {
  const [action, setAction] = useState<DataAction>('export')
  const [useConstraints, setUseConstraints] = useState(false)
  const [employeeConstraints, setEmployeeConstraints] = useState<EmployeeConstraints>(
    EMPTY_EMPLOYEE_CONSTRAINTS,
  )
  const [importFile, setImportFile] = useState<File | null>(null)
  const [operations, setOperations] = useState<OperationRow[]>([])
  const [loadingOps, setLoadingOps] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const loadOperations = useCallback(async () => {
    setLoadingOps(true)
    try {
      const res = await erpFetch<{ data: OperationRow[] }>(
        '/api/data-import-export/operations?segment=employees',
      )
      setOperations(res.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load operation history')
    } finally {
      setLoadingOps(false)
    }
  }, [])

  useEffect(() => {
    void loadOperations()
  }, [loadOperations])

  const activeConstraints = useMemo(() => {
    if (!useConstraints) return {}
    const c: Record<string, string> = {}
    if (employeeConstraints.department.trim()) {
      c.department = employeeConstraints.department.trim()
    }
    if (employeeConstraints.status !== 'all') {
      c.status = employeeConstraints.status
    }
    return c
  }, [useConstraints, employeeConstraints])

  const handleConstraintsToggle = (checked: boolean) => {
    setUseConstraints(checked)
    if (!checked) {
      setEmployeeConstraints({ ...EMPTY_EMPLOYEE_CONSTRAINTS })
    }
  }

  const downloadSample = async () => {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const { blob, filename } = await erpFetchBlob(
        '/api/data-import-export/sample?segment=employees',
      )
      downloadBlob(blob, filename ?? 'Import_employees_format.csv')
      setMessage('Sample file downloaded.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to download sample')
    } finally {
      setBusy(false)
    }
  }

  const runExport = async () => {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const { blob, filename } = await erpFetchBlob('/api/data-import-export/export', {
        method: 'POST',
        body: { segment: 'employees', constraints: activeConstraints },
      })
      downloadBlob(blob, filename ?? 'employees-export.csv')
      setMessage('Export completed and downloaded.')
      await loadOperations()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setBusy(false)
    }
  }

  const runImport = async () => {
    if (!importFile) {
      setError('Choose a CSV or Excel file to import.')
      return
    }
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const formData = new FormData()
      formData.append('segment', 'employees')
      formData.append('file', importFile)
      const res = await erpFetch<{
        message?: string
        warning?: string
      }>('/api/data-import-export/import', {
        method: 'POST',
        body: formData,
      })
      const parts = [res.message ?? 'Import completed.']
      if (res.warning?.trim()) {
        parts.push(res.warning.trim())
      }
      setMessage(parts.join('\n\n'))
      setImportFile(null)
      await loadOperations()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setBusy(false)
    }
  }

  const handlePrimaryAction = () => {
    if (action === 'export') void runExport()
    else void runImport()
  }

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild className="gap-2">
          <Link href="/dashboard/hr/employees">
            <ArrowLeft size={18} />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Import / Export Employees
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Download or upload employee master data as CSV. Columns marked with * in the sample are
            required. Document uploads are not included in import.
          </p>
        </div>
      </div>

      {error && (
        <pre className="text-sm text-red-600 whitespace-pre-wrap font-sans">{error}</pre>
      )}
      {message && (
        <pre className="text-sm text-emerald-700 dark:text-emerald-400 whitespace-pre-wrap font-sans">
          {message}
        </pre>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Configure</CardTitle>
          <CardDescription>Select import or export, then run the action or upload a file.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <FieldLabel htmlFor="action" required>
              Action
            </FieldLabel>
            <select
              id="action"
              value={action}
              onChange={(e) => {
                const next = e.target.value as DataAction
                setAction(next)
                setImportFile(null)
                setError(null)
                setMessage(null)
                if (next === 'import') {
                  setUseConstraints(false)
                  setEmployeeConstraints({ ...EMPTY_EMPLOYEE_CONSTRAINTS })
                }
              }}
              className="w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="export">Export</option>
              <option value="import">Import</option>
            </select>
          </div>

          {action === 'import' && (
            <>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                disabled={busy}
                onClick={() => void downloadSample()}
              >
                <Download className="size-4" />
                Download sample
              </Button>
              <div>
                <FieldLabel htmlFor="import-file" required>
                  Upload file
                </FieldLabel>
                <Input
                  id="import-file"
                  type="file"
                  accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="mt-1"
                  onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                />
                <p className="mt-1 text-xs text-muted-foreground">CSV or Excel (.xlsx, .xls)</p>
              </div>
            </>
          )}

          {action === 'export' && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={useConstraints}
                onCheckedChange={(v) => handleConstraintsToggle(Boolean(v))}
              />
              Add constraints
            </label>
          )}

          {action === 'export' && useConstraints && (
            <div className="rounded-md border p-4 space-y-4 bg-muted/20">
              <p className="text-sm font-medium">Employee filters</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FieldLabel htmlFor="department">Department</FieldLabel>
                  <select
                    id="department"
                    value={employeeConstraints.department}
                    onChange={(e) =>
                      setEmployeeConstraints((prev) => ({ ...prev, department: e.target.value }))
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">All departments</option>
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel htmlFor="status">Status</FieldLabel>
                  <select
                    id="status"
                    value={employeeConstraints.status}
                    onChange={(e) =>
                      setEmployeeConstraints((prev) => ({
                        ...prev,
                        status: e.target.value as EmployeeConstraints['status'],
                      }))
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="all">All</option>
                    <option value="active_employee">Active</option>
                    <option value="deboarded">Deboarded</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <Button type="button" disabled={busy} onClick={handlePrimaryAction}>
            {busy ? 'Working…' : action === 'export' ? 'Export' : 'Import'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent operations</CardTitle>
          <CardDescription>Import and export activity for employees.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Performed by</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Rows</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingOps ? (
                  <TableRow>
                    <TableCell colSpan={5}>Loading…</TableCell>
                  </TableRow>
                ) : operations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>No operations yet.</TableCell>
                  </TableRow>
                ) : (
                  operations.map((row) => {
                    const href = performerHref(row)
                    const label = performerLabel(row)
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="capitalize">{row.action}</TableCell>
                        <TableCell>
                          {href ? (
                            <Link href={href} className="text-primary hover:underline">
                              {label}
                            </Link>
                          ) : (
                            label
                          )}
                        </TableCell>
                        <TableCell>{formatWhen(row.created_at)}</TableCell>
                        <TableCell>{row.row_count ?? '—'}</TableCell>
                        <TableCell className="capitalize">{row.status.replace(/_/g, ' ')}</TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
