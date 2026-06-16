'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Search } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type PaymentAccountRow = {
  id: string
  name: string
  purpose: string
  total_paid?: number
  total_received?: number
  balance?: number
  created_at?: string | null
  created_by_user?: { first_name?: string | null; last_name?: string | null; email?: string | null } | null
}

type MeUser = {
  role?: string | null
}

function createdByLabel(row: PaymentAccountRow): string {
  const user = row.created_by_user
  if (!user) return '—'
  const name = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()
  return name || user.email || '—'
}

function formatCurrency(value: number): string {
  return `₹${value.toFixed(2)}`
}

export default function PaymentAccountsPage() {
  const [rows, setRows] = useState<PaymentAccountRow[]>([])
  const [totals, setTotals] = useState({ total_paid: 0, total_received: 0, balance: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    void load()
  }, [])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [accountsRes, meRes] = await Promise.all([
        erpFetch<{
          data: PaymentAccountRow[]
          totals: { total_paid: number; total_received: number; balance: number }
        }>('/api/payment-accounts'),
        erpFetch<{ user: MeUser }>('/api/me'),
      ])
      setRows(accountsRes.data ?? [])
      setTotals(accountsRes.totals ?? { total_paid: 0, total_received: 0, balance: 0 })
      setIsAdmin(meRes.user.role === 'admin')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load payment accounts')
    } finally {
      setLoading(false)
    }
  }

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((row) => {
      const createdBy = createdByLabel(row).toLowerCase()
      return (
        row.name.toLowerCase().includes(term) ||
        row.purpose.toLowerCase().includes(term) ||
        createdBy.includes(term)
      )
    })
  }, [rows, searchTerm])

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/dashboard/finance">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft size={16} />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Payment Accounts</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Accounts used for payment entries with running balances.
            </p>
          </div>
        </div>
        {isAdmin ? (
          <Link href="/dashboard/finance/payment-accounts/new">
            <Button className="gap-2">
              <Plus size={16} />
              Create Payment Account
            </Button>
          </Link>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Paid (Outward)</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(totals.total_paid)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Received (Inward)</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(totals.total_received)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Net Balance</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(totals.balance)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Payment Accounts</CardTitle>
          <CardDescription>Running balance = received − paid for each account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name, purpose, or creator..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading payment accounts...</p>
          ) : filteredRows.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">No payment accounts found.</p>
              {isAdmin ? (
                <Button asChild>
                  <Link href="/dashboard/finance/payment-accounts/new">
                    <Plus className="size-4 mr-2" />
                    Create Payment Account
                  </Link>
                </Button>
              ) : null}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name of Account</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>{row.purpose}</TableCell>
                    <TableCell>{createdByLabel(row)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(row.total_paid ?? 0))}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(row.total_received ?? 0))}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(Number(row.balance ?? 0))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
