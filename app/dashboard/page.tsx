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
import { Button } from '@/components/ui/button'

type PendingPurchaseReceipt = {
  id: string
  pr_number: string
  status: string
  seller_sales_invoice_number?: string | null
  total_amount?: number | null
  uploaded_at?: string | null
  created_at: string
  suppliers?: { name?: string | null } | null
}

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
  const [pendingPurchaseReceipts, setPendingPurchaseReceipts] = useState<PendingPurchaseReceipt[]>([])
  const [approvingPurchaseReceiptId, setApprovingPurchaseReceiptId] = useState<string | null>(null)

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

  const loadDashboard = async () => {
    setLoading(true)
    setError(null)
    try {
      const [salesRes, workRes, purchaseReceiptRes] = await Promise.all([
        erpFetch<{ data: Array<{ status: string }> }>('/api/sales-orders'),
        erpFetch<{ data: Array<{ status: string }> }>('/api/work-orders'),
        erpFetch<{ data: PendingPurchaseReceipt[] }>('/api/purchase/receipts'),
      ])

      const sales = salesRes.data ?? []
      const workOrders = workRes.data ?? []
      const purchaseReceipts = purchaseReceiptRes.data ?? []
      const pendingReceipts = purchaseReceipts.filter((p) => p.status === 'pending_approval')

      setMetrics({
        totalSalesOrders: sales.length,
        pendingSalesApprovals: sales.filter((s) => s.status === 'pending_approval').length,
        activeWorkOrders: workOrders.filter((w) => ['pending', 'in_progress'].includes(w.status))
          .length,
        purchasePendingApprovals: pendingReceipts.length,
      })
      setPendingPurchaseReceipts(me?.role === 'admin' ? pendingReceipts : [])

      if (me?.role === 'admin') {
        const dispatchRes = await erpFetch<{ data: Array<{ id: string; do_number?: string | null; customer_name?: string | null; created_at: string }> }>(
          '/api/dispatch/orders?status=awaiting_approval',
        )
        setDispatchPendingRows(dispatchRes.data ?? [])
      } else {
        setDispatchPendingRows([])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadDashboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.role])

  const approvePurchaseReceipt = async (receiptId: string) => {
    setApprovingPurchaseReceiptId(receiptId)
    setError(null)
    try {
      await erpFetch(`/api/purchase/receipts/${receiptId}/approve`, { method: 'POST', body: {} })
      await loadDashboard()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to approve purchase receipt')
    } finally {
      setApprovingPurchaseReceiptId(null)
    }
  }

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
              Purchase Receipt Pending Approval
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
              <CardTitle className="text-lg">Purchase Receipts Pending Approval</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingPurchaseReceipts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No purchase receipts pending approval.</p>
              ) : (
                <div className="space-y-2">
                  {pendingPurchaseReceipts.map((receipt) => (
                    <div key={receipt.id} className="rounded-md border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <Link href={`/dashboard/purchase/receipts/${receipt.id}`} className="min-w-0 hover:underline">
                          <p className="truncate font-mono text-sm">
                            {receipt.pr_number}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {receipt.seller_sales_invoice_number ?? 'No seller invoice number'} • {receipt.suppliers?.name ?? '-'} •{' '}
                            {receipt.total_amount != null ? `₹${Number(receipt.total_amount).toFixed(2)}` : '—'} •{' '}
                            {new Date(receipt.uploaded_at ?? receipt.created_at).toLocaleString('en-IN')}
                          </p>
                        </Link>
                        <Button
                          size="sm"
                          onClick={() => void approvePurchaseReceipt(receipt.id)}
                          disabled={approvingPurchaseReceiptId === receipt.id}
                        >
                          {approvingPurchaseReceiptId === receipt.id ? 'Approving...' : 'Approve'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}

        {me?.role === 'admin' ? (
          <Card className="border-border/70 bg-card/70 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Dispatch Pending Approval</CardTitle>
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
