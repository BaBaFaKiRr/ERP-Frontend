'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowLeft, ClipboardList, Trash2 } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { cn } from '@/lib/utils'
import { EntityActivityLog } from '@/components/entity-activity-log'

type ItemRef = {
  id: string
  sku: string
  name: string
  uom?: string | null
} | null

type LineRow = {
  id: string
  item_id: string
  direction: 'in' | 'out'
  quantity: number
  items?: ItemRef
}

type StockEntryDetail = {
  id: string
  se_number: string
  purpose: string
  created_at: string
  sequence_base?: string | null
  sub_index?: number | null
  store_employee_name: string | null
  notes: string | null
  material_issue_requests?: { request_number?: string | null } | null
  work_order_id?: string | null
  material_entry_id?: string | null
  sales_invoice_id?: string | null
  purchase_receipt_id?: string | null
  created_by?: string | null
  deleted_at?: string | null
  stock_entry_lines?: LineRow[] | null
}

const PURPOSE_LABEL: Record<string, string> = {
  adjustment: 'Adjustment',
  issue_raw_material: 'Issue (raw material)',
  receipt_fg: 'Receipt (finished goods)',
  receipt_purchase: 'Receipt (purchase)',
  dispatch_sales: 'Dispatch (sales)',
  wastage_movement: 'Wastage movement',
}

function formatPurpose(p: string) {
  return PURPOSE_LABEL[p] ?? p.replace(/_/g, ' ')
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

function MetaRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (value == null || value === '') return null
  return (
    <div>
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="font-medium break-all">{value}</p>
    </div>
  )
}

function MetaRowAlways({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="font-medium break-all">{value}</p>
    </div>
  )
}

export default function StockEntryDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params.id === 'string' ? params.id : ''

  const [entry, setEntry] = useState<StockEntryDetail | null>(null)
  const [me, setMe] = useState<{ role: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const res = await erpFetch<{ data: StockEntryDetail }>(`/api/stock-entries/${id}`)
      setEntry(res.data ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load stock entry')
      setEntry(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    void (async () => {
      try {
        const res = await erpFetch<{ user: { role: string } }>('/api/me')
        setMe(res.user ?? null)
      } catch {
        setMe(null)
      }
    })()
  }, [])

  const isAdmin = me?.role === 'admin'

  const handleDelete = async () => {
    if (!id) return
    setDeleting(true)
    try {
      const res = await erpFetch<{ data: StockEntryDetail }>(`/api/stock-entries/${id}`, {
        method: 'DELETE',
      })
      setEntry(res.data ?? null)
      setDeleteOpen(false)
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete stock entry')
    } finally {
      setDeleting(false)
    }
  }

  if (loading && !entry) {
    return <div className="p-8 text-muted-foreground">Loading stock entry…</div>
  }

  if (error || !entry) {
    return (
      <div className="p-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard/inventory/stock-entries">
            <ArrowLeft className="mr-2 size-4" />
            Back to stock entries
          </Link>
        </Button>
        <p className="text-destructive">{error ?? 'Stock entry not found'}</p>
      </div>
    )
  }

  const lines = entry.stock_entry_lines ?? []
  const isDeleted = Boolean(entry.deleted_at)

  return (
    <div className={cn('p-8 max-w-4xl', isDeleted && 'opacity-90')}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/inventory/stock-entries" aria-label="Back">
              <ArrowLeft size={20} />
            </Link>
          </Button>
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white font-mono">{entry.se_number}</h1>
            <p className="text-gray-600 mt-2">{formatPurpose(entry.purpose)}</p>
            <p className="text-sm text-muted-foreground mt-1">{formatDate(entry.created_at)}</p>
            {isDeleted && entry.deleted_at && (
              <p className="text-sm font-medium text-amber-900 mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                Deleted — stock effects were reversed on {formatDate(entry.deleted_at)}. This record is
                kept for audit.
              </p>
            )}
          </div>
        </div>
        {isAdmin && !isDeleted && (
          <Button
            variant="outline"
            className="text-destructive border-destructive/50 hover:bg-destructive/10 gap-2 shrink-0"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
            Delete stock entry
          </Button>
        )}
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this stock entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will <strong>reverse all stock movements</strong> from this posting (on-hand
              quantities and ledger). Work order shipped/produced counts tied to this entry will be rolled
              back where applicable. The document will stay in the list marked as deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="destructive" disabled={deleting} onClick={() => void handleDelete()}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList size={22} />
              Details
            </CardTitle>
            <CardDescription>Header and source links for this posting.</CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-6 text-sm">
            <MetaRowAlways
              label="Store / operator"
              value={entry.store_employee_name?.trim() ? entry.store_employee_name : '—'}
            />
            <MetaRow label="Material issue request" value={entry.material_issue_requests?.request_number ?? undefined} />
            <MetaRow
              label="Sequence"
              value={
                entry.sequence_base != null && entry.sub_index != null
                  ? `${entry.sequence_base} (sub ${entry.sub_index})`
                  : undefined
              }
            />
            <div className="sm:col-span-2">
              <p className="text-muted-foreground text-sm">Notes</p>
              <p className="font-medium whitespace-pre-wrap">{entry.notes?.trim() ? entry.notes : '—'}</p>
            </div>
            <MetaRow label="Work order ID" value={entry.work_order_id ?? undefined} />
            <MetaRow label="Material entry ID" value={entry.material_entry_id ?? undefined} />
            <MetaRow label="Sales invoice ID" value={entry.sales_invoice_id ?? undefined} />
            <MetaRow label="Purchase receipt ID" value={entry.purchase_receipt_id ?? undefined} />
            <MetaRow label="Created by (user ID)" value={entry.created_by ?? undefined} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lines</CardTitle>
            <CardDescription>Quantities and directions per item.</CardDescription>
          </CardHeader>
          <CardContent>
            {lines.length === 0 ? (
              <p className="text-sm text-muted-foreground">No lines on this entry.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>SKU</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>UOM</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line) => {
                      const it = line.items
                      const sku = it?.sku ?? '—'
                      const name = it?.name ?? '—'
                      const uom = it?.uom ?? '—'
                      return (
                        <TableRow key={line.id}>
                          <TableCell className="font-mono text-sm">
                            <Link
                              href={`/dashboard/inventory/items/${line.item_id}`}
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {sku}
                            </Link>
                          </TableCell>
                          <TableCell>{name}</TableCell>
                          <TableCell>{uom}</TableCell>
                          <TableCell>
                            {line.direction === 'in' ? (
                              <span className="text-green-700 font-medium">In (+)</span>
                            ) : (
                              <span className="text-red-700 font-medium">Out (−)</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-medium">
                            {Number(line.quantity)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <EntityActivityLog entityType="stock_entry" entityId={entry?.id} />
    </div>
  )
}
