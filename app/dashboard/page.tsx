'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { erpFetch } from '@/lib/erp-api'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

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

type DispatchSalesInvoice = {
  id: string
  dispatch_order_id: string
  invoice_number: string
  total_amount?: number | null
  status: 'active' | 'cancelled'
}

type PurchaseInvoiceRow = {
  id: string
  status: string
  total_amount?: number | null
}

type DispatchPendingApproval = {
  id: string
  do_number?: string | null
  customer_name?: string | null
  created_at: string
  sales_orders?: { order_number?: string | null } | null
}

type SalesOrderPendingApproval = {
  id: string
  order_number: string
  created_at: string
  total_amount?: number | null
  customers?: { name?: string | null } | null
}

type PendingApprovalItem = {
  id: string
  kind: 'purchase_receipt' | 'sales_invoice' | 'sales_order'
  kindLabel: string
  reference: string
  subtitle: string
  href: string
  createdAt: string
}

type MeUser = {
  role: string
  firstName?: string | null
  lastName?: string | null
  email: string
}

function formatCurrency(value: number): string {
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function buildPendingApprovals(
  pendingReceipts: PendingPurchaseReceipt[],
  dispatchPending: DispatchPendingApproval[],
  invoiceByDispatchId: Map<string, DispatchSalesInvoice>,
  pendingSalesOrders: SalesOrderPendingApproval[],
): PendingApprovalItem[] {
  const items: PendingApprovalItem[] = []

  for (const receipt of pendingReceipts) {
    items.push({
      id: `pr-${receipt.id}`,
      kind: 'purchase_receipt',
      kindLabel: 'Purchase Receipt',
      reference: receipt.pr_number,
      subtitle: [
        receipt.seller_sales_invoice_number ?? 'No seller invoice number',
        receipt.suppliers?.name ?? '-',
        receipt.total_amount != null ? formatCurrency(Number(receipt.total_amount)) : '—',
        new Date(receipt.uploaded_at ?? receipt.created_at).toLocaleString('en-IN'),
      ].join(' • '),
      href: `/dashboard/purchase/receipts/${receipt.id}`,
      createdAt: receipt.uploaded_at ?? receipt.created_at,
    })
  }

  for (const row of dispatchPending) {
    const invoice = invoiceByDispatchId.get(row.id)
    items.push({
      id: `si-${row.id}`,
      kind: 'sales_invoice',
      kindLabel: 'Sales Invoice',
      reference: invoice?.invoice_number ?? row.do_number ?? '—',
      subtitle: [
        row.sales_orders?.order_number ? `SO ${row.sales_orders.order_number}` : null,
        row.customer_name ?? '-',
        invoice?.total_amount != null ? formatCurrency(Number(invoice.total_amount)) : '—',
        new Date(row.created_at).toLocaleString('en-IN'),
      ]
        .filter(Boolean)
        .join(' • '),
      href: `/dashboard/finance/invoice-requests/${row.id}`,
      createdAt: row.created_at,
    })
  }

  for (const order of pendingSalesOrders) {
    items.push({
      id: `so-${order.id}`,
      kind: 'sales_order',
      kindLabel: 'Sales Order',
      reference: order.order_number,
      subtitle: [
        order.customers?.name ?? '-',
        order.total_amount != null ? formatCurrency(Number(order.total_amount)) : '—',
        new Date(order.created_at).toLocaleString('en-IN'),
      ].join(' • '),
      href: `/dashboard/sales/${order.id}`,
      createdAt: order.created_at,
    })
  }

  return items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState({
    totalSalesOrders: 0,
    pendingSalesApprovals: 0,
    activeWorkOrders: 0,
    purchasePendingApprovals: 0,
  })
  const [adminTotals, setAdminTotals] = useState({ totalSales: 0, totalPurchases: 0 })
  const [me, setMe] = useState<MeUser | null>(null)
  const [pendingApprovals, setPendingApprovals] = useState<PendingApprovalItem[]>([])

  const isAdmin = me?.role === 'admin'

  useEffect(() => {
    const loadMe = async () => {
      try {
        const meRes = await erpFetch<{ user: MeUser }>('/api/me')
        setMe(meRes.user ?? null)
      } catch {
        setMe(null)
      }
    }

    void loadMe()
  }, [])

  const loadDashboard = async () => {
    setLoading(true)
    setError(null)
    try {
      if (me?.role === 'admin') {
        const [salesInvoicesRes, purchaseInvoicesRes, purchaseReceiptRes, dispatchRes, salesOrdersRes] =
          await Promise.all([
            erpFetch<{ data: DispatchSalesInvoice[] }>('/api/dispatch-sales-invoices'),
            erpFetch<{ data: PurchaseInvoiceRow[] }>('/api/purchase/invoices'),
            erpFetch<{ data: PendingPurchaseReceipt[] }>('/api/purchase/receipts'),
            erpFetch<{ data: DispatchPendingApproval[] }>(
              '/api/dispatch/orders?status=awaiting_approval',
            ),
            erpFetch<{ data: SalesOrderPendingApproval[] }>('/api/sales-orders?status=pending_approval'),
          ])

        const salesInvoices = salesInvoicesRes.data ?? []
        const purchaseInvoices = purchaseInvoicesRes.data ?? []
        const purchaseReceipts = purchaseReceiptRes.data ?? []
        const dispatchPending = dispatchRes.data ?? []
        const pendingSalesOrders = salesOrdersRes.data ?? []

        const invoiceByDispatchId = new Map<string, DispatchSalesInvoice>()
        for (const inv of salesInvoices) {
          if (inv.status !== 'active') continue
          const existing = invoiceByDispatchId.get(inv.dispatch_order_id)
          if (!existing || inv.invoice_number > existing.invoice_number) {
            invoiceByDispatchId.set(inv.dispatch_order_id, inv)
          }
        }

        const totalSales = salesInvoices
          .filter((inv) => inv.status === 'active')
          .reduce((sum, inv) => sum + Number(inv.total_amount ?? 0), 0)

        const totalPurchases = purchaseInvoices
          .filter((inv) => inv.status !== 'cancelled')
          .reduce((sum, inv) => sum + Number(inv.total_amount ?? 0), 0)

        const pendingReceipts = purchaseReceipts.filter((p) => p.status === 'pending_approval')

        setAdminTotals({ totalSales, totalPurchases })
        setPendingApprovals(
          buildPendingApprovals(
            pendingReceipts,
            dispatchPending,
            invoiceByDispatchId,
            pendingSalesOrders,
          ),
        )
        setMetrics({
          totalSalesOrders: 0,
          pendingSalesApprovals: 0,
          activeWorkOrders: 0,
          purchasePendingApprovals: pendingReceipts.length,
        })
        return
      }

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
      setPendingApprovals([])
      setAdminTotals({ totalSales: 0, totalPurchases: 0 })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (me === null) return
    void loadDashboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.role])

  const displayName = `${me?.firstName ?? ''} ${me?.lastName ?? ''}`.trim()

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          {displayName ? `Hello, ${displayName}` : 'Hello'}
        </h1>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {isAdmin ? (
        <>
          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card className="border-border/70 bg-card/70 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04] dark:backdrop-blur-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold text-emerald-500 dark:text-emerald-400">
                  {loading ? '…' : formatCurrency(adminTotals.totalSales)}
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/70 bg-card/70 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04] dark:backdrop-blur-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Purchases</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold text-red-400 dark:text-red-400">
                  {loading ? '…' : formatCurrency(adminTotals.totalPurchases)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/70 bg-card/70 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04] dark:backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-lg">Pending Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : pendingApprovals.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing pending your approval.</p>
              ) : (
                <div className="space-y-2">
                  {pendingApprovals.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      className="block rounded-md border p-3 hover:bg-muted/40"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-mono text-sm">{item.reference}</p>
                          <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                          {item.kindLabel}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/70 bg-card/70 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04] dark:backdrop-blur-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Sales Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{loading ? '…' : metrics.totalSalesOrders}</div>
            </CardContent>
          </Card>
          <Card className="border-border/70 bg-card/70 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04] dark:backdrop-blur-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Sales Pending Approval
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">
                {loading ? '…' : metrics.pendingSalesApprovals}
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/70 bg-card/70 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04] dark:backdrop-blur-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Work Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{loading ? '…' : metrics.activeWorkOrders}</div>
            </CardContent>
          </Card>
          <Card className="border-border/70 bg-card/70 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04] dark:backdrop-blur-md">
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
      )}
    </div>
  )
}
