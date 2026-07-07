'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Download } from 'lucide-react'
import { erpFetch, erpFetchBlob, erpImportStream, downloadBlob, type ImportProgressUpdate } from '@/lib/erp-api'
import { ImportProgressPanel } from '@/components/import/ImportProgressPanel'
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

type DataAction = 'import' | 'export'
type DataSegment = 'suppliers' | 'customers' | 'items'

type SupplierConstraints = {
  supplier_type: 'all' | 'domestic' | 'international'
  supplier_country: string
  has_gst: 'all' | 'yes' | 'no'
}

type CustomerConstraints = {
  customer_type: 'all' | 'oem' | 'oe' | 'distributor' | 'export' | 'ecommerce' | 'retail'
  ecommerce_platform: 'all' | 'amazon' | 'flipkart' | 'direct'
}

type OperationRow = {
  id: string
  action: DataAction
  segment: DataSegment
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

const EMPTY_SUPPLIER_CONSTRAINTS: SupplierConstraints = {
  supplier_type: 'all',
  supplier_country: '',
  has_gst: 'all',
}

const EMPTY_CUSTOMER_CONSTRAINTS: CustomerConstraints = {
  customer_type: 'all',
  ecommerce_platform: 'all',
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

function ImportExportPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromParam = searchParams.get('from')
  const segmentParam = searchParams.get('segment')
  const initialSegment: DataSegment =
    segmentParam === 'customers'
      ? 'customers'
      : segmentParam === 'items'
        ? 'items'
        : 'suppliers'

  const [action, setAction] = useState<DataAction>(
    searchParams.get('action') === 'import' ? 'import' : 'export',
  )
  const [segment, setSegment] = useState<DataSegment>(initialSegment)
  const [useConstraints, setUseConstraints] = useState(false)
  const [supplierConstraints, setSupplierConstraints] = useState<SupplierConstraints>(
    EMPTY_SUPPLIER_CONSTRAINTS,
  )
  const [customerConstraints, setCustomerConstraints] = useState<CustomerConstraints>(
    EMPTY_CUSTOMER_CONSTRAINTS,
  )
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importProgress, setImportProgress] = useState<ImportProgressUpdate | null>(null)
  const [operations, setOperations] = useState<OperationRow[]>([])
  const [loadingOps, setLoadingOps] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const loadOperations = useCallback(async () => {
    setLoadingOps(true)
    try {
      const res = await erpFetch<{ data: OperationRow[] }>(
        `/api/data-import-export/operations?segment=${segment}`,
      )
      setOperations(res.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load operation history')
    } finally {
      setLoadingOps(false)
    }
  }, [segment])

  useEffect(() => {
    void loadOperations()
  }, [loadOperations])

  useEffect(() => {
    setSegment(initialSegment)
  }, [initialSegment])

  const activeConstraints = useMemo(() => {
    if (!useConstraints) return {}
    if (segment === 'suppliers') {
      const c: Record<string, string> = {}
      if (supplierConstraints.supplier_type !== 'all') {
        c.supplier_type = supplierConstraints.supplier_type
      }
      if (supplierConstraints.supplier_country.trim()) {
        c.supplier_country = supplierConstraints.supplier_country.trim()
      }
      if (supplierConstraints.has_gst !== 'all') {
        c.has_gst = supplierConstraints.has_gst
      }
      return c
    }
    const c: Record<string, string> = {}
    if (customerConstraints.customer_type !== 'all') {
      c.customer_type = customerConstraints.customer_type
    }
    if (customerConstraints.ecommerce_platform !== 'all') {
      c.ecommerce_platform = customerConstraints.ecommerce_platform
    }
    return c
  }, [useConstraints, segment, supplierConstraints, customerConstraints])

  const handleConstraintsToggle = (checked: boolean) => {
    setUseConstraints(checked)
    if (!checked) {
      setSupplierConstraints({ ...EMPTY_SUPPLIER_CONSTRAINTS })
      setCustomerConstraints({ ...EMPTY_CUSTOMER_CONSTRAINTS })
    }
  }

  const handleSegmentChange = (next: DataSegment) => {
    setSegment(next)
    setUseConstraints(false)
    setSupplierConstraints({ ...EMPTY_SUPPLIER_CONSTRAINTS })
    setCustomerConstraints({ ...EMPTY_CUSTOMER_CONSTRAINTS })
    setImportFile(null)
    setError(null)
    setMessage(null)
    router.replace(
      `/dashboard/import-export?segment=${next}${fromParam === 'settings' ? '&from=settings' : ''}`,
    )
  }

  const downloadSample = async () => {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const { blob, filename } = await erpFetchBlob(
        `/api/data-import-export/sample?segment=${segment}`,
      )
      downloadBlob(blob, filename ?? `${segment}-sample.csv`)
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
        body: { segment, constraints: activeConstraints },
      })
      downloadBlob(blob, filename ?? `${segment}-export.csv`)
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
    setImportProgress(null)
    try {
      const formData = new FormData()
      formData.append('segment', segment)
      formData.append('file', importFile)
      if (useConstraints && Object.keys(activeConstraints).length > 0) {
        formData.append('constraints', JSON.stringify(activeConstraints))
      }
      const res = await erpImportStream(formData, setImportProgress)
      const parts = [res.message ?? 'Import completed.']
      if (res.warning?.trim()) {
        parts.push(res.warning.trim())
      }
      setMessage(parts.join('\n\n'))
      setImportFile(null)
      await loadOperations()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Import failed'
      if (msg.toLowerCase().includes('not implemented')) {
        setMessage(msg)
        await loadOperations()
      } else {
        setError(msg)
      }
    } finally {
      setImportProgress(null)
      setBusy(false)
    }
  }

  const handlePrimaryAction = () => {
    if (action === 'export') void runExport()
    else void runImport()
  }

  const backHref =
    fromParam === 'settings'
      ? '/dashboard/settings'
      : segment === 'items'
        ? '/dashboard/inventory/items'
        : segment === 'suppliers'
          ? '/dashboard/purchase/suppliers'
          : '/dashboard/sales/create'

  const backLabel = fromParam === 'settings' ? 'Back to Settings' : 'Back'

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild className="gap-2">
          <Link href={backHref}>
            <ArrowLeft size={18} />
            {backLabel}
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Import / Export Data</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Download or upload supplier, customer, and item master data as CSV or Excel.
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
          <CardDescription>Select action and data segment, then run export or upload a file.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    setSupplierConstraints({ ...EMPTY_SUPPLIER_CONSTRAINTS })
                    setCustomerConstraints({ ...EMPTY_CUSTOMER_CONSTRAINTS })
                  }
                }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="export">Export</option>
                <option value="import">Import</option>
              </select>
            </div>
            <div>
              <FieldLabel htmlFor="segment" required>
                Data segment
              </FieldLabel>
              <select
                id="segment"
                value={segment}
                onChange={(e) => handleSegmentChange(e.target.value as DataSegment)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="suppliers">Suppliers</option>
                <option value="customers">Customers</option>
                <option value="items">Items</option>
              </select>
            </div>
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
              {importProgress ? (
                <ImportProgressPanel progress={importProgress} fileName={importFile?.name} />
              ) : null}
            </>
          )}

          {action === 'export' && segment !== 'items' && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={useConstraints} onCheckedChange={(v) => handleConstraintsToggle(Boolean(v))} />
              Add constraints
            </label>
          )}

          {action === 'export' && useConstraints && segment === 'suppliers' && (
            <div className="rounded-md border p-4 space-y-4 bg-muted/20">
              <p className="text-sm font-medium">Supplier filters</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <FieldLabel htmlFor="supplier-type">Supplier type</FieldLabel>
                  <select
                    id="supplier-type"
                    value={supplierConstraints.supplier_type}
                    onChange={(e) =>
                      setSupplierConstraints((prev) => ({
                        ...prev,
                        supplier_type: e.target.value as SupplierConstraints['supplier_type'],
                      }))
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="all">All</option>
                    <option value="domestic">Domestic</option>
                    <option value="international">International</option>
                  </select>
                </div>
                <div>
                  <FieldLabel htmlFor="supplier-country">Country contains</FieldLabel>
                  <Input
                    id="supplier-country"
                    value={supplierConstraints.supplier_country}
                    onChange={(e) =>
                      setSupplierConstraints((prev) => ({ ...prev, supplier_country: e.target.value }))
                    }
                    placeholder="e.g. India"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="has-gst">GST number</FieldLabel>
                  <select
                    id="has-gst"
                    value={supplierConstraints.has_gst}
                    onChange={(e) =>
                      setSupplierConstraints((prev) => ({
                        ...prev,
                        has_gst: e.target.value as SupplierConstraints['has_gst'],
                      }))
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="all">Any</option>
                    <option value="yes">Has GST</option>
                    <option value="no">No GST</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {action === 'export' && useConstraints && segment === 'customers' && (
            <div className="rounded-md border p-4 space-y-4 bg-muted/20">
              <p className="text-sm font-medium">Customer filters</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FieldLabel htmlFor="customer-type">Customer type</FieldLabel>
                  <select
                    id="customer-type"
                    value={customerConstraints.customer_type}
                    onChange={(e) =>
                      setCustomerConstraints((prev) => ({
                        ...prev,
                        customer_type: e.target.value as CustomerConstraints['customer_type'],
                      }))
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="all">All</option>
                    <option value="oem">OEM</option>
                    <option value="oe">OE</option>
                    <option value="distributor">Distributor</option>
                    <option value="export">Export</option>
                    <option value="ecommerce">Ecommerce</option>
                    <option value="retail">Retail</option>
                  </select>
                </div>
                <div>
                  <FieldLabel htmlFor="ecommerce-platform">Ecommerce platform</FieldLabel>
                  <select
                    id="ecommerce-platform"
                    value={customerConstraints.ecommerce_platform}
                    onChange={(e) =>
                      setCustomerConstraints((prev) => ({
                        ...prev,
                        ecommerce_platform: e.target.value as CustomerConstraints['ecommerce_platform'],
                      }))
                    }
                    className="disabled:opacity-50 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    disabled={customerConstraints.customer_type !== 'ecommerce' && customerConstraints.customer_type !== 'all'}
                  >
                    <option value="all">All</option>
                    <option value="amazon">Amazon</option>
                    <option value="flipkart">Flipkart</option>
                    <option value="direct">Direct</option>
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
          <CardDescription>Import and export activity for {segment}.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Segment</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Rows</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingOps ? (
                  <TableRow>
                    <TableCell colSpan={6}>Loading…</TableCell>
                  </TableRow>
                ) : operations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>No operations yet.</TableCell>
                  </TableRow>
                ) : (
                  operations.map((row) => {
                    const href = performerHref(row)
                    const label = performerLabel(row)
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="capitalize">{row.action}</TableCell>
                        <TableCell className="capitalize">{row.segment}</TableCell>
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

export default function ImportExportPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading…</div>}>
      <ImportExportPageContent />
    </Suspense>
  )
}
