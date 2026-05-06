'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { erpFetch } from '@/lib/erp-api'

type ScrapRow = {
  id: string
  production_line_id: string
  item_id: string
  quantity: number
  created_at: string
  item?: { id: string; sku?: string | null; name?: string | null } | null
  line?: { id: string; name?: string | null } | null
}

export default function ScrapPage() {
  const [rows, setRows] = useState<ScrapRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const res = await erpFetch<{ data: ScrapRow[] }>('/api/inventory/scrap')
        setRows(res.data ?? [])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load scrap logs')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <div className="p-6 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Scrap</CardTitle>
          <CardDescription>Wastage deposits from production lines.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {!loading && !error && rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No scrap logs found.</p>
          ) : null}
          {rows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Line</th>
                    <th className="py-2 pr-3">Item</th>
                    <th className="py-2 pr-3">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b">
                      <td className="py-2 pr-3">{new Date(row.created_at).toLocaleString()}</td>
                      <td className="py-2 pr-3">{row.line?.name ?? '-'}</td>
                      <td className="py-2 pr-3">{row.item?.sku ?? '—'} - {row.item?.name ?? 'Item'}</td>
                      <td className="py-2 pr-3">{Number(row.quantity ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
