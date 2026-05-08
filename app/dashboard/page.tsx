'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { erpFetch } from '@/lib/erp-api'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function DashboardPage() {
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState({
    totalSalesOrders: 0,
    pendingSalesApprovals: 0,
    activeWorkOrders: 0,
    purchasePendingApprovals: 0,
  })
  const [me, setMe] = useState<{ role: string } | null>(null)
  const [dispatchPendingRows, setDispatchPendingRows] = useState<
    Array<{ id: string; do_number?: string | null; customer_name?: string | null; created_at: string }>
  >([])

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
      try {
        const meRes = await erpFetch<{ user: { role: string } }>('/api/me')
        setMe(meRes.user ?? null)
      } catch {
        setMe(null)
      }
    }

    getUser()
  }, [supabase])

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const [salesRes, workRes, purchaseRes] = await Promise.all([
          erpFetch<{ data: Array<{ status: string }> }>('/api/sales-orders'),
          erpFetch<{ data: Array<{ status: string }> }>('/api/work-orders'),
          erpFetch<{ data: Array<{ status: string }> }>('/api/purchase/orders'),
        ])

        const sales = salesRes.data ?? []
        const workOrders = workRes.data ?? []
        const purchaseOrders = purchaseRes.data ?? []

        setMetrics({
          totalSalesOrders: sales.length,
          pendingSalesApprovals: sales.filter((s) => s.status === 'pending_approval').length,
          activeWorkOrders: workOrders.filter((w) => ['pending', 'in_progress'].includes(w.status))
            .length,
          purchasePendingApprovals: purchaseOrders.filter((p) => p.status === 'pending_approval')
            .length,
        })
        if (me?.role === 'admin') {
          const dispatchRes = await erpFetch<{ data: Array<{ id: string; do_number?: string | null; customer_name?: string | null; created_at: string }> }>(
            '/api/dispatch/orders?status=awaiting_approval',
          )
          setDispatchPendingRows(dispatchRes.data ?? [])
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    })()
  }, [me?.role])

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Welcome to ERP Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          {user?.email ? `Hello, ${user.email}` : 'Manufacturing Operations Center'}
        </p>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/70 bg-card/70 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sales Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{loading ? '…' : metrics.totalSalesOrders}</div>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/70 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sales Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{loading ? '…' : metrics.pendingSalesApprovals}</div>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/70 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Work Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{loading ? '…' : metrics.activeWorkOrders}</div>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/70 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Purchase Pending Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">
              {loading ? '…' : metrics.purchasePendingApprovals}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="border-border/70 bg-card/70 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">Operational Snapshot</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Dashboard tiles now use live ERP data only. Add more analytics when your production data
              volume grows.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/70 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/50 py-2">
                <span className="text-sm">Database</span>
                <Badge className="bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/15">
                  Operational
                </Badge>
              </div>
              <div className="flex items-center justify-between border-b border-border/50 py-2">
                <span className="text-sm">API Server</span>
                <Badge className="bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/15">
                  Operational
                </Badge>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm">Backups</span>
                <Badge className="bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/15">
                  Managed by Supabase
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {me?.role === 'admin' ? (
          <Card className="border-border/70 bg-card/70 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Pending Approval</CardTitle>
            </CardHeader>
            <CardContent>
              {dispatchPendingRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No dispatch orders pending approval.</p>
              ) : (
                <div className="space-y-2">
                  {dispatchPendingRows.map((row) => (
                    <Link
                      key={row.id}
                      href={`/dashboard/finance/invoice-requests/${row.id}`}
                      className="block rounded-md border p-3 hover:bg-muted/40"
                    >
                      <p className="font-mono text-sm">{row.do_number ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.customer_name ?? '-'} • {new Date(row.created_at).toLocaleString('en-IN')}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
