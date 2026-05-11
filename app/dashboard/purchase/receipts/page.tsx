'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Search } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'

type PurchaseReceiptRow = {
  id: string
  pr_number: string
  status: string
  due_date?: string | null
  total_amount?: number | null
  suppliers?: { name?: string | null } | null
  purchase_receipt_lines?: Array<{ id: string }> | null
}

const statusConfig = {
  pending_approval: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending Approval' },
  approved: { color: 'bg-blue-100 text-blue-800', label: 'Approved' },
  paid: { color: 'bg-green-100 text-green-800', label: 'Paid' },
  cancelled: { color: 'bg-slate-200 text-slate-700', label: 'Cancelled' },
}

export default function PurchaseReceiptsPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [rows, setRows] = useState<PurchaseReceiptRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void load()
  }, [])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await erpFetch<{ data: PurchaseReceiptRow[] }>('/api/purchase/receipts')
      setRows(res.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load purchase receipts')
    } finally {
      setLoading(false)
    }
  }

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return rows
    return rows.filter(
      (row) =>
        row.pr_number.toLowerCase().includes(term) ||
        (row.suppliers?.name ?? '').toLowerCase().includes(term),
    )
  }, [searchTerm, rows])

  const totalValue = rows.reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0)
  const approvedCount = rows.filter((row) => row.status === 'approved').length
  const pendingCount = rows.filter((row) => row.status === 'pending_approval').length

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Purchase Receipts</h1>
          <p className="mt-2 text-gray-600">List and track all purchase receipts</p>
        </div>
        <Link href="/dashboard/purchase/receipts/new">
          <Button className="flex items-center gap-2">
            <Plus size={18} />
            Add Purchase Receipt
          </Button>
        </Link>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Receipts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rows.length}</div>
            <p className="text-xs text-gray-600">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{approvedCount}</div>
            <p className="text-xs text-gray-600">Ready for payment</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
            <p className="text-xs text-gray-600">Awaiting approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalValue.toLocaleString('en-IN')}</div>
            <p className="text-xs text-gray-600">Receipt value</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchase Receipt Records</CardTitle>
          <CardDescription>Search and view all purchase receipts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <Input
                placeholder="Search by receipt number or supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="button" variant="outline" onClick={() => void load()}>
              Refresh
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-slate-900/60">
                  <TableHead className="text-gray-700 dark:text-slate-200">Receipt Number</TableHead>
                  <TableHead className="text-gray-700 dark:text-slate-200">Supplier</TableHead>
                  <TableHead className="text-gray-700 dark:text-slate-200">Due Date</TableHead>
                  <TableHead className="text-right text-gray-700 dark:text-slate-200">Amount (INR)</TableHead>
                  <TableHead className="text-gray-700 dark:text-slate-200">Items</TableHead>
                  <TableHead className="text-gray-700 dark:text-slate-200">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6}>Loading…</TableCell>
                  </TableRow>
                ) : filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>No purchase receipts found.</TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer text-gray-800 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800/40"
                      onClick={() => router.push(`/dashboard/purchase/receipts/${row.id}`)}
                    >
                      <TableCell className="font-mono font-semibold">{row.pr_number}</TableCell>
                      <TableCell>{row.suppliers?.name ?? '—'}</TableCell>
                      <TableCell>
                        {row.due_date ? new Date(row.due_date).toLocaleDateString('en-GB') : '—'}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {row.total_amount != null ? `₹${Number(row.total_amount).toFixed(2)}` : '—'}
                      </TableCell>
                      <TableCell>{row.purchase_receipt_lines?.length ?? 0}</TableCell>
                      <TableCell>
                        <span
                          className={`text-xs px-3 py-1 rounded-full ${
                            statusConfig[row.status as keyof typeof statusConfig]?.color ??
                            'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {statusConfig[row.status as keyof typeof statusConfig]?.label ?? row.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
