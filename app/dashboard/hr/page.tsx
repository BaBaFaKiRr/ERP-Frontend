'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowRight, Plus, Users } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'

type Employee = {
  id: string
  employee_code: string
  full_name?: string | null
  department?: string | null
  position?: string | null
  date_of_hire?: string | null
}

export default function HROverviewPage() {
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [pendingApprovals, setPendingApprovals] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const [employeesRes, meRes] = await Promise.all([
          erpFetch<{ data: Employee[] }>('/api/employees'),
          erpFetch<{ user: { role: string } }>('/api/me'),
        ])
        setEmployees(employeesRes.data ?? [])
        const admin = meRes.user.role === 'admin'
        setIsAdmin(admin)
        if (admin) {
          const pendingRes = await erpFetch<{ data: unknown[] }>(
            '/api/employees/status-requests/pending/list',
          )
          setPendingApprovals((pendingRes.data ?? []).length)
        } else {
          setPendingApprovals(0)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load HR overview')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const recentEmployees = useMemo(
    () =>
      [...employees]
        .sort((a, b) => (b.date_of_hire ?? '').localeCompare(a.date_of_hire ?? ''))
        .slice(0, 5),
    [employees],
  )

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">HR</h1>
          <p className="mt-2 text-gray-600 dark:text-muted-foreground">
            Human resources overview and employee management
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild className="gap-2">
            <Link href="/dashboard/hr/employees">
              <Users size={18} />
              Employees
            </Link>
          </Button>
          <Button asChild className="gap-2">
            <Link href="/dashboard/hr/new">
              <Plus size={18} />
              Add employee
            </Link>
          </Button>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total employees</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{loading ? '…' : employees.length}</p>
          </CardContent>
        </Card>
        {isAdmin ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending approvals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{loading ? '…' : pendingApprovals}</p>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl font-bold">
                <Link href="/dashboard/hr/employees" className="hover:underline">
                  Employees
                </Link>
              </CardTitle>
              <CardDescription>Recently added or updated records</CardDescription>
            </div>
            <Button asChild size="sm" variant="outline" className="gap-1">
              <Link href="/dashboard/hr/employees">
                View all
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Position</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4}>Loading…</TableCell>
                </TableRow>
              ) : recentEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4}>No employees yet.</TableCell>
                </TableRow>
              ) : (
                recentEmployees.map((employee) => (
                  <TableRow
                    key={employee.id}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => {
                      if (employee.employee_code) {
                        router.push(`/dashboard/hr/${employee.employee_code}`)
                      }
                    }}
                  >
                    <TableCell className="font-mono">{employee.employee_code}</TableCell>
                    <TableCell>{employee.full_name ?? '—'}</TableCell>
                    <TableCell>{employee.department ?? '—'}</TableCell>
                    <TableCell>{employee.position ?? '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
