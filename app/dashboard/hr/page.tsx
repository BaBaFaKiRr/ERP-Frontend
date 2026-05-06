'use client'

import { type FormEvent, useEffect, useMemo, useState } from 'react'
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
import { Plus } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'

const departments = [
  'Sales',
  'Production',
  'Quality',
  'Store',
  'Dispatch',
  'Accounts',
  'Impex',
  'General Staff',
  'Human Resources',
  'Management',
] as const

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

export default function HRPage() {
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([])
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    full_name: '',
    date_of_birth: '',
    department: '',
    position: '',
    date_of_hire: new Date().toISOString().slice(0, 10),
    salary_ctc: '',
    salary_in_hand: '',
    aadhar_card: null as File | null,
    pan_card: null as File | null,
    bank_proof: null as File | null,
    address: '',
    phone_numbers: '',
    email: '',
    account_holder_name: '',
    bank_name: '',
    bank_branch: '',
    ifsc_code: '',
    account_number: '',
    is_account_holder_different: false,
    account_holder_aadhar_card: null as File | null,
  })

  const salaryWarning = useMemo(() => {
    const ctc = Number(form.salary_ctc)
    const inHand = Number(form.salary_in_hand)
    if (!Number.isFinite(ctc) || !Number.isFinite(inHand) || ctc <= 0 || inHand <= 0) return null
    return inHand >= ctc ? 'In-hand salary must be less than CTC.' : null
  }, [form.salary_ctc, form.salary_in_hand])

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

  async function handleCreateEmployee(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (salaryWarning) {
      setError(salaryWarning)
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const payload = new FormData()
      payload.append('full_name', form.full_name.trim())
      payload.append('date_of_birth', form.date_of_birth)
      payload.append('department', form.department.trim())
      payload.append('position', form.position.trim())
      payload.append('date_of_hire', form.date_of_hire)
      payload.append('salary_ctc', form.salary_ctc)
      payload.append('salary_in_hand', form.salary_in_hand)
      payload.append('address', form.address.trim())
      payload.append('phone_numbers', form.phone_numbers)
      payload.append('email', form.email.trim())
      payload.append('account_holder_name', form.account_holder_name.trim())
      payload.append('bank_name', form.bank_name.trim())
      payload.append('bank_branch', form.bank_branch.trim())
      payload.append('ifsc_code', form.ifsc_code.trim())
      payload.append('account_number', form.account_number.trim())
      payload.append('is_account_holder_different', String(form.is_account_holder_different))
      if (form.aadhar_card) payload.append('aadhar_card', form.aadhar_card)
      if (form.pan_card) payload.append('pan_card', form.pan_card)
      if (form.bank_proof) payload.append('bank_proof', form.bank_proof)
      if (form.account_holder_aadhar_card) payload.append('account_holder_aadhar_card', form.account_holder_aadhar_card)

      await erpFetch('/api/employees', {
        method: 'POST',
        body: payload,
      })
      setForm({
        full_name: '',
        date_of_birth: '',
        department: '',
        position: '',
        date_of_hire: new Date().toISOString().slice(0, 10),
        salary_ctc: '',
        salary_in_hand: '',
        aadhar_card: null,
        pan_card: null,
        bank_proof: null,
        address: '',
        phone_numbers: '',
        email: '',
        account_holder_name: '',
        bank_name: '',
        bank_branch: '',
        ifsc_code: '',
        account_number: '',
        is_account_holder_different: false,
        account_holder_aadhar_card: null,
      })
      setFormOpen(false)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create employee')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">HR & Employees</h1>
          <p className="text-gray-600 mt-2">Manage employees, payroll, and HR operations</p>
        </div>
        <Button className="flex items-center gap-2" onClick={() => setFormOpen((prev) => !prev)}>
          <Plus size={18} />
          Add Employee
        </Button>
        <Button asChild variant="outline" className="ml-2">
          <Link href="/dashboard/hr/edit-logs">Edit Logs</Link>
        </Button>
      </div>

      {error ? (
        <Card className="mb-6 border-red-300 bg-red-50">
          <CardContent className="pt-6 text-red-700">{error}</CardContent>
        </Card>
      ) : null}

      {formOpen ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add Employee</CardTitle>
            <CardDescription>Create standalone employee profile (ERP user not required)</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleCreateEmployee}>
              <label className="flex flex-col gap-2 text-sm">
                Name
                <input
                  className="h-10 rounded-md border px-3 bg-background"
                  value={form.full_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
                  required
                />
              </label>

              <label className="flex flex-col gap-2 text-sm">
                Date of Birth
                <input
                  type="date"
                  className="h-10 rounded-md border px-3 bg-background"
                  value={form.date_of_birth}
                  onChange={(e) => setForm((prev) => ({ ...prev, date_of_birth: e.target.value }))}
                  required
                />
              </label>

              <label className="flex flex-col gap-2 text-sm">
                Department
                <select
                  className="h-10 rounded-md border px-3 bg-background"
                  value={form.department}
                  onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))}
                  required
                >
                  <option value="">Select department</option>
                  {departments.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm">
                Position
                <input
                  className="h-10 rounded-md border px-3 bg-background"
                  value={form.position}
                  onChange={(e) => setForm((prev) => ({ ...prev, position: e.target.value }))}
                />
              </label>

              <label className="flex flex-col gap-2 text-sm md:col-span-2">
                Address
                <input
                  className="h-10 rounded-md border px-3 bg-background"
                  value={form.address}
                  onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                  required
                />
              </label>

              <label className="flex flex-col gap-2 text-sm">
                Phone Numbers (comma separated)
                <input
                  className="h-10 rounded-md border px-3 bg-background"
                  value={form.phone_numbers}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone_numbers: e.target.value }))}
                  placeholder="9876543210, 9123456780"
                  required
                />
              </label>

              <label className="flex flex-col gap-2 text-sm">
                Email (optional)
                <input
                  type="email"
                  className="h-10 rounded-md border px-3 bg-background"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                />
              </label>

              <label className="flex flex-col gap-2 text-sm">
                Date of Hire
                <input
                  type="date"
                  className="h-10 rounded-md border px-3 bg-background"
                  value={form.date_of_hire}
                  onChange={(e) => setForm((prev) => ({ ...prev, date_of_hire: e.target.value }))}
                  required
                />
              </label>

              <label className="flex flex-col gap-2 text-sm">
                Salary (CTC)
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  className="h-10 rounded-md border px-3 bg-background"
                  value={form.salary_ctc}
                  onChange={(e) => setForm((prev) => ({ ...prev, salary_ctc: e.target.value }))}
                  required
                />
              </label>

              <label className="flex flex-col gap-2 text-sm">
                Salary (In Hand)
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  className="h-10 rounded-md border px-3 bg-background"
                  value={form.salary_in_hand}
                  onChange={(e) => setForm((prev) => ({ ...prev, salary_in_hand: e.target.value }))}
                  required
                />
              </label>

              <label className="flex flex-col gap-2 text-sm">
                Aadhar Card (file)
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  className="h-10 rounded-md border px-3 bg-background file:mr-3 file:border-0 file:bg-transparent"
                  onChange={(e) => setForm((prev) => ({ ...prev, aadhar_card: e.target.files?.[0] ?? null }))}
                  required
                />
              </label>

              <label className="flex flex-col gap-2 text-sm">
                Pan Card (file, optional)
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  className="h-10 rounded-md border px-3 bg-background file:mr-3 file:border-0 file:bg-transparent"
                  onChange={(e) => setForm((prev) => ({ ...prev, pan_card: e.target.files?.[0] ?? null }))}
                />
              </label>

              <label className="flex flex-col gap-2 text-sm md:col-span-2">
                Bank Proof (cheque/passbook file)
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  className="h-10 rounded-md border px-3 bg-background file:mr-3 file:border-0 file:bg-transparent"
                  onChange={(e) => setForm((prev) => ({ ...prev, bank_proof: e.target.files?.[0] ?? null }))}
                  required
                />
              </label>

              <label className="flex flex-col gap-2 text-sm">
                Account Holder Name
                <input
                  className="h-10 rounded-md border px-3 bg-background"
                  value={form.account_holder_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, account_holder_name: e.target.value }))}
                  required
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                Bank Name
                <input
                  className="h-10 rounded-md border px-3 bg-background"
                  value={form.bank_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, bank_name: e.target.value }))}
                  required
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                Bank Branch
                <input
                  className="h-10 rounded-md border px-3 bg-background"
                  value={form.bank_branch}
                  onChange={(e) => setForm((prev) => ({ ...prev, bank_branch: e.target.value }))}
                  required
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                IFSC Code
                <input
                  className="h-10 rounded-md border px-3 bg-background"
                  value={form.ifsc_code}
                  onChange={(e) => setForm((prev) => ({ ...prev, ifsc_code: e.target.value }))}
                  required
                />
              </label>
              <label className="flex flex-col gap-2 text-sm md:col-span-2">
                Account Number
                <input
                  className="h-10 rounded-md border px-3 bg-background"
                  value={form.account_number}
                  onChange={(e) => setForm((prev) => ({ ...prev, account_number: e.target.value }))}
                  required
                />
              </label>
              <label className="md:col-span-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_account_holder_different}
                  onChange={(e) => setForm((prev) => ({ ...prev, is_account_holder_different: e.target.checked }))}
                />
                Is Account holder different from Employee
              </label>

              {form.is_account_holder_different ? (
                <label className="flex flex-col gap-2 text-sm md:col-span-2">
                  Account Holder Aadhar Card
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    className="h-10 rounded-md border px-3 bg-background file:mr-3 file:border-0 file:bg-transparent"
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, account_holder_aadhar_card: e.target.files?.[0] ?? null }))
                    }
                    required
                  />
                </label>
              ) : null}

              {salaryWarning ? <p className="md:col-span-2 text-sm text-red-600">{salaryWarning}</p> : null}

              <div className="md:col-span-2 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting || Boolean(salaryWarning)}>
                  {submitting ? 'Saving...' : 'Create Employee'}
                </Button>
              </div>
            </form>
          </CardContent>
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
