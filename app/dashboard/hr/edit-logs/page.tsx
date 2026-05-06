'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { erpFetch } from '@/lib/erp-api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type EditLog = {
  id: string
  action: string
  created_at: string
  details: Record<string, unknown>
  employee?: { employee_code?: string | null; full_name?: string | null } | null
  actor?: { first_name?: string | null; last_name?: string | null; email?: string | null; role?: string | null } | null
}

export default function HREditLogsPage() {
  const [logs, setLogs] = useState<EditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await erpFetch<{ data: EditLog[] }>('/api/employees/edit-logs/list')
        setLogs(res.data ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load edit logs')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">HR Edit Logs</h1>
          <p className="text-gray-600 mt-1">Audit trail for changes made to employee records</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/hr">Back to HR</Link>
        </Button>
      </div>

      {loading ? <p className="text-gray-600">Loading logs...</p> : null}
      {error ? <p className="text-red-600">{error}</p> : null}

      {!loading && !error ? (
        <Card>
          <CardHeader>
            <CardTitle>Recent edits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No edit logs yet.</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="rounded-md border p-3 text-sm">
                  <p className="font-medium">
                    {log.employee?.employee_code ?? '-'} - {log.employee?.full_name ?? 'Employee'}
                  </p>
                  <p>
                    Action: {log.action} | By:{' '}
                    {[log.actor?.first_name, log.actor?.last_name].filter(Boolean).join(' ') || log.actor?.email || 'Unknown'}
                    {log.actor?.role ? ` (${log.actor.role})` : ''} | On: {new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
