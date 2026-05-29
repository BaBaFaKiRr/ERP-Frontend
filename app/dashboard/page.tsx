'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { erpFetch } from '@/lib/erp-api'
import { DashboardWidget } from '@/components/dashboard/dashboard-widget'
import { cn } from '@/lib/utils'
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

type DashboardSummary = {
  sales_orders_pending_approval: number
  work_orders_open: number
  sales_orders_approved_awaiting_wo: number
  overdue_payables_count: number
  overdue_receivables_count: number
}

const PERIOD_OPTIONS = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'fiscal', label: 'This Fiscal Year' },
]

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'receivables', label: 'Receivables' },
  { id: 'payables', label: 'Procurement & Payables' },
  { id: 'operations', label: 'Manufacturing' },
  { id: 'approvals', label: 'Approvals' },
] as const

type TabId = (typeof TABS)[number]['id']

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

function MetricRow({ label, value, href }: { label: string; value: string | number; href?: string }) {
  const inner = (
    <div className="flex items-center justify-between gap-2 py-2">
      <span className="text-sm text-[#64748b] dark:text-slate-400">{label}</span>
      <span className="text-lg font-semibold tabular-nums text-[#0f172a] dark:text-white">
        {value}
      </span>
    </div>
  )
  if (href) {
    return (
      <Link href={href} className="block rounded-md hover:bg-[#f1f5f9] dark:hover:bg-white/5">
        {inner}
      </Link>
    )
  }
  return inner
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [period, setPeriod] = useState('fiscal')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [me, setMe] = useState<MeUser | null>(null)
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [adminTotals, setAdminTotals] = useState({ totalSales: 0, totalPurchases: 0 })
  const [pendingApprovals, setPendingApprovals] = useState<PendingApprovalItem[]>([])
  const [metrics, setMetrics] = useState({
    totalSalesOrders: 0,
    pendingSalesApprovals: 0,
    activeWorkOrders: 0,
    purchasePendingApprovals: 0,
  })
  const isAdmin = me?.role === 'admin'
  const displayName = `${me?.firstName ?? ''} ${me?.lastName ?? ''}`.trim()

  useEffect(() => {
    void (async () => {
      try {
        const meRes = await erpFetch<{ user: MeUser }>('/api/me')
        setMe(meRes.user ?? null)
      } catch {
        setMe(null)
      }
    })()
  }, [])

  const loadDashboard = async () => {
    setLoading(true)
    setError(null)
    try {
      const summaryRes = await erpFetch<{ data: DashboardSummary }>('/api/analytics/dashboard-summary')
      setSummary(summaryRes.data ?? null)

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

  const showApprovals = activeTab === 'approvals' || (activeTab === 'overview' && isAdmin)

  return (
    <div className="min-h-full p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-[#1e293b] dark:text-white">
          Business Overview
        </h1>
        {displayName ? (
          <p className="mt-1 text-sm text-[#64748b] dark:text-slate-400">
            Welcome back, {displayName}
          </p>
        ) : null}
      </div>

      <div className="mb-6 flex flex-wrap gap-6 border-b border-[#e2e8f0] dark:border-white/10">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              '-mb-px border-b-2 pb-2.5 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'border-[#2563eb] text-[#2563eb]'
                : 'border-transparent text-[#64748b] hover:text-[#334155] dark:text-slate-400 dark:hover:text-slate-200',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mb-6 overflow-hidden rounded-lg border border-[#dbeafe] bg-gradient-to-r from-[#eff6ff] via-white to-[#f0f9ff] p-4 dark:border-[#3b82f6]/25 dark:from-[#1e3a5f]/40 dark:via-[#1a1f2e] dark:to-[#0f172a] md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[#3b82f6]">
              LEJER ERP
            </p>
            <h2 className="mt-1 text-lg font-semibold text-[#0f172a] dark:text-white">
              Manufacturing operations at a glance
            </h2>
            <p className="mt-1 max-w-xl text-sm text-[#64748b] dark:text-slate-400">
              Track sales, purchases, production, and approvals from one place. Use the left menu to
              open each module.
            </p>
          </div>
          <Button asChild className="shrink-0 rounded-md bg-[#2563eb] hover:bg-[#1d4ed8]">
            <Link href="/dashboard/sales/orders">View sales orders</Link>
          </Button>
        </div>
      </div>

      {error ? <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p> : null}

      {(activeTab === 'overview' || activeTab === 'receivables') && (
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <DashboardWidget
            title="Receivable Summary"
            period={period}
            periodOptions={PERIOD_OPTIONS}
            onPeriodChange={setPeriod}
            className="lg:col-span-1"
            isEmpty={!summary && !loading}
          >
            <div className="divide-y divide-[#e8edf3] dark:divide-white/10">
              <MetricRow
                label="Overdue receivables"
                value={loading ? '…' : (summary?.overdue_receivables_count ?? 0)}
                href="/dashboard/finance/statement-of-account"
              />
              <MetricRow
                label="Sales pending approval"
                value={
                  loading
                    ? '…'
                    : isAdmin
                      ? pendingApprovals.filter((p) => p.kindLabel === 'Sales Order').length
                      : metrics.pendingSalesApprovals
                }
                href="/dashboard/sales/orders"
              />
              {isAdmin ? (
                <MetricRow
                  label="Total sales (invoiced)"
                  value={loading ? '…' : formatCurrency(adminTotals.totalSales)}
                  href="/dashboard/finance/sales-invoices"
                />
              ) : null}
            </div>
          </DashboardWidget>

          <DashboardWidget
            title="Payable Summary"
            period={period}
            periodOptions={PERIOD_OPTIONS}
            onPeriodChange={setPeriod}
            className="lg:col-span-1"
            isEmpty={!summary && !loading}
          >
            <div className="divide-y divide-[#e8edf3] dark:divide-white/10">
              <MetricRow
                label="Payments due"
                value={loading ? '…' : (summary?.overdue_payables_count ?? 0)}
                href="/dashboard/finance/purchase-invoices"
              />
              <MetricRow
                label="Purchase receipts pending"
                value={loading ? '…' : metrics.purchasePendingApprovals}
                href="/dashboard/purchase/receipts"
              />
              {isAdmin ? (
                <MetricRow
                  label="Total purchases"
                  value={loading ? '…' : formatCurrency(adminTotals.totalPurchases)}
                  href="/dashboard/finance/purchase-invoices"
                />
              ) : null}
            </div>
          </DashboardWidget>

          <DashboardWidget
            title="Performance Indicators"
            period={period}
            periodOptions={PERIOD_OPTIONS}
            onPeriodChange={setPeriod}
            className="lg:col-span-1"
          >
            <div className="divide-y divide-[#e8edf3] dark:divide-white/10">
              <MetricRow
                label="Open work orders"
                value={loading ? '…' : (summary?.work_orders_open ?? metrics.activeWorkOrders)}
                href="/dashboard/manufacturing/work-orders"
              />
              <MetricRow
                label="SOs awaiting work order"
                value={loading ? '…' : (summary?.sales_orders_approved_awaiting_wo ?? 0)}
                href="/dashboard/manufacturing"
              />
              <MetricRow
                label="Total sales orders"
                value={loading ? '…' : metrics.totalSalesOrders}
                href="/dashboard/sales/orders"
              />
            </div>
          </DashboardWidget>
        </div>
      )}

      {(activeTab === 'overview' || activeTab === 'operations') && (
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DashboardWidget
            title="Production Pipeline"
            period={period}
            periodOptions={PERIOD_OPTIONS}
            onPeriodChange={setPeriod}
          >
            {loading ? (
              <p className="text-sm text-[#64748b] dark:text-slate-400">Loading…</p>
            ) : (
              <div className="space-y-3">
                <MetricRow
                  label="Active work orders"
                  value={summary?.work_orders_open ?? metrics.activeWorkOrders}
                  href="/dashboard/manufacturing/work-orders"
                />
                <MetricRow
                  label="Approved SOs — no WO yet"
                  value={summary?.sales_orders_approved_awaiting_wo ?? 0}
                  href="/dashboard/manufacturing"
                />
              </div>
            )}
          </DashboardWidget>

          <DashboardWidget
            title="Cash Position"
            period={period}
            periodOptions={PERIOD_OPTIONS}
            onPeriodChange={setPeriod}
            isEmpty={!isAdmin && !loading}
            emptyMessage="Cash position summary is available to admin and finance roles."
          >
            {isAdmin && !loading ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-md bg-[#ecfdf5] p-4 dark:bg-emerald-950/30">
                  <p className="text-xs font-medium text-[#059669] dark:text-emerald-400">Sales</p>
                  <p className="mt-1 text-xl font-semibold text-[#047857] dark:text-emerald-300">
                    {formatCurrency(adminTotals.totalSales)}
                  </p>
                </div>
                <div className="rounded-md bg-[#fef2f2] p-4 dark:bg-red-950/30">
                  <p className="text-xs font-medium text-[#dc2626] dark:text-red-400">Purchases</p>
                  <p className="mt-1 text-xl font-semibold text-[#b91c1c] dark:text-red-300">
                    {formatCurrency(adminTotals.totalPurchases)}
                  </p>
                </div>
              </div>
            ) : null}
          </DashboardWidget>
        </div>
      )}

      {showApprovals && (
        <DashboardWidget
          title="Pending Approvals"
          className="mb-6"
          isEmpty={!loading && pendingApprovals.length === 0}
          emptyMessage="Nothing pending your approval right now."
        >
          {!loading && pendingApprovals.length > 0 ? (
            <div className="space-y-2">
              {pendingApprovals.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-start justify-between gap-3 rounded-md border border-[#e8edf3] p-3 transition-colors hover:bg-[#f8fafc] dark:border-white/10 dark:hover:bg-white/5"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-medium text-[#0f172a] dark:text-white">
                      {item.reference}
                    </p>
                    <p className="text-xs text-[#64748b] dark:text-slate-400">{item.subtitle}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                    {item.kindLabel}
                  </span>
                </Link>
              ))}
            </div>
          ) : null}
        </DashboardWidget>
      )}

      {activeTab === 'payables' && !showApprovals && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DashboardWidget title="Procurement overview" period={period} periodOptions={PERIOD_OPTIONS} onPeriodChange={setPeriod}>
            <MetricRow
              label="Receipts pending approval"
              value={loading ? '…' : metrics.purchasePendingApprovals}
              href="/dashboard/purchase/receipts"
            />
            <MetricRow
              label="Payments due"
              value={loading ? '…' : (summary?.overdue_payables_count ?? 0)}
              href="/dashboard/finance/purchase-invoices"
            />
          </DashboardWidget>
          <DashboardWidget title="Purchase orders" isEmpty emptyMessage="Open Purchase from the left menu to create and track POs." />
        </div>
      )}
    </div>
  )
}
