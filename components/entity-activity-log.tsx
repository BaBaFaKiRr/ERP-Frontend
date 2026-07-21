'use client'

import { useEffect, useState } from 'react'
import { erpFetch } from '@/lib/erp-api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export type ActivityEntityType =
  | 'employee'
  | 'customer'
  | 'supplier'
  | 'item'
  | 'sales_order'
  | 'work_order'
  | 'purchase_order'
  | 'purchase_receipt'
  | 'purchase_invoice'
  | 'stock_entry'
  | 'warehouse'
  | 'bom'
  | 'sales_invoice'
  | 'payment_entry'
  | 'journal_entry'
  | 'credit_note'
  | 'debit_note'
  | 'material_issue_request'
  | 'material_deposit_request'
  | 'payment_account'
  | 'general_entry'
  | 'dispatch'

type ActivityLogRow = {
  id: string
  entity_type: string
  entity_id: string
  entity_label: string | null
  action: 'create' | 'update' | 'delete'
  actor_name: string
  actor_employee_id: string | null
  actor_employee?: { employee_code?: string | null; full_name?: string | null } | null
  details: Record<string, unknown>
  created_at: string
}

const ENTITY_LABELS: Record<string, string> = {
  employee: 'Employee',
  customer: 'Customer',
  supplier: 'Supplier',
  item: 'Item',
  sales_order: 'Sales order',
  work_order: 'Work order',
  purchase_order: 'Purchase order',
  purchase_receipt: 'Purchase receipt',
  purchase_invoice: 'Purchase invoice',
  stock_entry: 'Stock entry',
  warehouse: 'Warehouse',
  bom: 'Bill of materials',
  sales_invoice: 'Sales invoice',
  payment_entry: 'Payment entry',
  journal_entry: 'Journal entry',
  credit_note: 'Credit note',
  debit_note: 'Debit note',
  material_issue_request: 'Material issue request',
  material_deposit_request: 'Material deposit request',
  payment_account: 'Payment account',
  general_entry: 'General entry',
  dispatch: 'Dispatch',
}

const ACTION_LABELS: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
}

function formatAction(log: ActivityLogRow): string {
  const legacy = log.details?.legacy_action
  if (typeof legacy === 'string' && legacy.length > 0) {
    return legacy.replace(/_/g, ' ')
  }
  return ACTION_LABELS[log.action] ?? log.action
}

export function EntityActivityLog({
  entityType,
  entityId,
}: {
  entityType: ActivityEntityType
  entityId: string | null | undefined
}) {
  const [logs, setLogs] = useState<ActivityLogRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!entityId) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await erpFetch<{ data: ActivityLogRow[] }>(
          `/api/activity-logs?entity_type=${encodeURIComponent(entityType)}&entity_id=${encodeURIComponent(entityId)}`,
        )
        if (!cancelled) setLogs(res.data ?? [])
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load activity log')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [entityType, entityId])

  if (!entityId) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity log</CardTitle>
        <CardDescription>
          Create, edit, and delete actions on this {ENTITY_LABELS[entityType]?.toLowerCase() ?? 'record'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? <p className="text-sm text-muted-foreground">Loading activity…</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {!loading && !error && logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        ) : null}
        {logs.map((log) => (
          <div key={log.id} className="rounded-md border p-3 text-sm">
            <p className="font-medium capitalize">{formatAction(log)}</p>
            <p className="text-muted-foreground">
              By: {log.actor_name}
              {log.actor_employee?.employee_code ? ` (${log.actor_employee.employee_code})` : ''}
              {log.actor_employee_id ? ` · Employee ID: ${log.actor_employee_id}` : ''}
            </p>
            <p className="text-muted-foreground">
              Data type: {ENTITY_LABELS[log.entity_type] ?? log.entity_type} ·{' '}
              {new Date(log.created_at).toLocaleString('en-IN')}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
