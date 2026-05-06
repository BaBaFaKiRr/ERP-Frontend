'use client'

import { useEffect, useState } from 'react'
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

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
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
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

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
      </div>
    </div>
  )
}
