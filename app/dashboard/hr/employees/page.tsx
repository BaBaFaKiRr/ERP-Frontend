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
import { EllipsisVertical, Plus } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { erpFetch } from '@/lib/erp-api'
import { GenerateReportButton } from '@/components/reports/generate-report-button'

type Employee = {
  id: string
  employee_code: string
  full_name?: string | null
  date_of_birth?: string | null
  department?: string | null
  position?: string | null
  date_of_hire?: string | null
  salary_ctc?: number | null
  salary_in_hand?: number | null
}

type PendingApproval = {
  id: string
  request_type: 'deboard' | 'rehire'
  reason_type?: string | null
  reason_description?: string | null
  effective_date?: string | null
  created_at?: string | null
  employee?: { employee_code?: string | null; full_name?: string | null } | null
  initiator?: { first_name?: string | null; last_name?: string | null; email?: string | null } | null
}

export default function EmployeesPage() {
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([])
  const [approvingId, setApprovingId] = useState<string | null>(null)

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return employees
    return employees.filter((employee) => {
      const code = (employee.employee_code ?? '').toLowerCase()
      const name = (employee.full_name ?? '').toLowerCase()
      return code.includes(q) || name.includes(q)
    })
  }, [employees, search])

  async function loadData() {
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
        const pendingRes = await erpFetch<{ data: PendingApproval[] }>('/api/employees/status-requests/pending/list')
        setPendingApprovals(pendingRes.data ?? [])
      } else {
        setPendingApprovals([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load HR data')
    } finally {
      setLoading(false)
    }
  }

  const handleApprovalAction = async (requestId: string, action: 'approve' | 'reject') => {
    setApprovingId(requestId)
    try {
      await erpFetch(`/api/employees/status-requests/${requestId}/${action}`, { method: 'POST' })
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} request`)
    } finally {
      setApprovingId(null)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Employees</h1>
          <p className="mt-2 text-gray-600 dark:text-muted-foreground">
            Manage employee records, payroll, and HR operations
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <GenerateReportButton reportType="salary_slips" />
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="icon" aria-label="More HR actions">
                  <EllipsisVertical className="size-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/hr/import-export">Import/Export Employees</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button asChild className="flex items-center gap-2">
            <Link href="/dashboard/hr/new">
              <Plus size={18} />
              Add Employee
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/hr/edit-logs">Edit Logs</Link>
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="mb-6 border-red-300 bg-red-50">
          <CardContent className="pt-6 text-red-700">{error}</CardContent>
        </Card>
      ) : null}


      {isAdmin ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Pending Approvals</CardTitle>
            <CardDescription>Deboard/Re-hire requests waiting for admin action</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingApprovals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending approvals.</p>
            ) : (
              <div className="space-y-3">
                {pendingApprovals.map((request) => {
                  const initiator =
                    [request.initiator?.first_name, request.initiator?.last_name].filter(Boolean).join(' ') ||
                    request.initiator?.email ||
                    'Unknown'
                  return (
                    <div key={request.id} className="rounded-md border p-3 text-sm flex flex-col gap-2">
                      <div>
                        <p className="font-medium">
                          {(request.employee?.employee_code ?? '-') + ' - ' + (request.employee?.full_name ?? 'Employee')}
                        </p>
                        <p className="text-muted-foreground">
                          {request.request_type.toUpperCase()} | Effective: {request.effective_date ?? '-'} | Requested by:{' '}
                          {initiator}
                        </p>
                        {request.reason_type ? <p className="text-muted-foreground">{request.reason_type}</p> : null}
                        {request.reason_description ? (
                          <p className="text-muted-foreground">{request.reason_description}</p>
                        ) : null}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={approvingId === request.id}
                          onClick={() => void handleApprovalAction(request.id, 'approve')}
                        >
                          {approvingId === request.id ? 'Working...' : 'Approve'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={approvingId === request.id}
                          onClick={() => void handleApprovalAction(request.id, 'reject')}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Human Resources Management</CardTitle>
          <CardDescription>Employee records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by employee ID or name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-md border px-3 bg-background text-sm"
            />
          </div>
          {loading ? (
            <p className="text-gray-600">Loading employees...</p>
          ) : filteredEmployees.length === 0 ? (
            <p className="text-gray-600">No employees yet. Click Add Employee to create one.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-3">Code</th>
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">DOB</th>
                    <th className="py-2 pr-3">Department</th>
                    <th className="py-2 pr-3">Position</th>
                    <th className="py-2 pr-3">Hire Date</th>
                    <th className="py-2 pr-3">CTC</th>
                    <th className="py-2 pr-3">In Hand</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((employee) => {
                    return (
                      <tr
                        key={employee.id}
                        className="border-b cursor-pointer hover:bg-muted/40"
                        onClick={() => {
                          if (employee.employee_code) router.push(`/dashboard/hr/${employee.employee_code}`)
                        }}
                      >
                        <td className="py-2 pr-3">{employee.employee_code}</td>
                        <td className="py-2 pr-3">{employee.full_name || '-'}</td>
                        <td className="py-2 pr-3">{employee.date_of_birth || '-'}</td>
                        <td className="py-2 pr-3">{employee.department || '-'}</td>
                        <td className="py-2 pr-3">{employee.position || '-'}</td>
                        <td className="py-2 pr-3">{employee.date_of_hire || '-'}</td>
                        <td className="py-2 pr-3">{employee.salary_ctc ?? '-'}</td>
                        <td className="py-2 pr-3">{employee.salary_in_hand ?? '-'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
