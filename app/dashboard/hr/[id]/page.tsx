'use client'

import { type FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { erpFetch } from '@/lib/erp-api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type Employee = {
  id: string
  employee_code: string
  status?: 'active_employee' | 'deboarded'
  full_name?: string | null
  date_of_birth?: string | null
  department?: string | null
  position?: string | null
  date_of_hire?: string | null
  salary_ctc?: number | null
  salary_in_hand?: number | null
  aadhar_card_path?: string | null
  pan_card_path?: string | null
  bank_proof_path?: string | null
  document_urls?: {
    aadhar_card?: string | null
    pan_card?: string | null
    bank_document?: string | null
    account_holder_aadhar?: string | null
  } | null
  contact?: {
    address?: string | null
    phone_numbers?: string[] | null
    email?: string | null
  } | null
  bank_details?: {
    account_holder_name?: string | null
    bank_name?: string | null
    bank_branch?: string | null
    ifsc_code?: string | null
    account_number?: string | null
    is_account_holder_different?: boolean | null
  } | null
  status_requests?: Array<{
    id: string
    request_type: 'deboard' | 'rehire'
    status: 'pending' | 'approved' | 'rejected'
    reason_type?: string | null
    reason_description?: string | null
    effective_date?: string | null
    created_at?: string | null
  }>
}

function isImageUrl(url: string): boolean {
  return /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url)
}

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

export default function EmployeeDetailsPage() {
  const params = useParams<{ id: string }>()
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [meRole, setMeRole] = useState<string | null>(null)
  const [showDeboardForm, setShowDeboardForm] = useState(false)
  const [showRehireForm, setShowRehireForm] = useState(false)
  const [showEditContactBank, setShowEditContactBank] = useState(false)
  const [deboardForm, setDeboardForm] = useState({
    reason_type: 'Company initiated Removal',
    reason_description: '',
    effective_date: new Date().toISOString().slice(0, 10),
  })
  const [rehireForm, setRehireForm] = useState({
    date_of_rehire: new Date().toISOString().slice(0, 10),
    department: '',
    position: '',
    salary_ctc: '',
    salary_in_hand: '',
    account_holder_name: '',
    bank_name: '',
    bank_branch: '',
    ifsc_code: '',
    account_number: '',
    is_account_holder_different: false,
    aadhar_card: null as File | null,
    pan_card: null as File | null,
    bank_proof: null as File | null,
    account_holder_aadhar_card: null as File | null,
  })
  const [contactBankForm, setContactBankForm] = useState({
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

  const isAdmin = useMemo(() => meRole === 'admin', [meRole])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [res, meRes] = await Promise.all([
          erpFetch<{ data: Employee }>(`/api/employees/by-code/${params.id}`),
          erpFetch<{ user: { role: string } }>('/api/me'),
        ])
        setEmployee(res.data)
        setMeRole(meRes.user.role)
        setContactBankForm({
          address: res.data.contact?.address ?? '',
          phone_numbers: (res.data.contact?.phone_numbers ?? []).join(', '),
          email: res.data.contact?.email ?? '',
          account_holder_name: res.data.bank_details?.account_holder_name ?? '',
          bank_name: res.data.bank_details?.bank_name ?? '',
          bank_branch: res.data.bank_details?.bank_branch ?? '',
          ifsc_code: res.data.bank_details?.ifsc_code ?? '',
          account_number: res.data.bank_details?.account_number ?? '',
          is_account_holder_different: Boolean(res.data.bank_details?.is_account_holder_different),
          account_holder_aadhar_card: null,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load employee')
      } finally {
        setLoading(false)
      }
    }
    if (params.id) void load()
  }, [params.id])

  const reload = async () => {
    const res = await erpFetch<{ data: Employee }>(`/api/employees/by-code/${params.id}`)
    setEmployee(res.data)
  }

  const submitDeboard = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await erpFetch(`/api/employees/${employee?.id}/deboard-request`, {
        method: 'POST',
        body: JSON.stringify(deboardForm),
      })
      setShowDeboardForm(false)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit deboard request')
    }
  }

  const submitRehire = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const payload = new FormData()
      Object.entries(rehireForm).forEach(([k, v]) => {
        if (v == null) return
        if (v instanceof File) payload.append(k, v)
        else payload.append(k, String(v))
      })
      await erpFetch(`/api/employees/${employee?.id}/rehire-request`, {
        method: 'POST',
        body: payload,
      })
      setShowRehireForm(false)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit re-hire request')
    }
  }

  const submitContactBank = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const payload = new FormData()
      payload.append('address', contactBankForm.address)
      payload.append('phone_numbers', contactBankForm.phone_numbers)
      payload.append('email', contactBankForm.email)
      payload.append('account_holder_name', contactBankForm.account_holder_name)
      payload.append('bank_name', contactBankForm.bank_name)
      payload.append('bank_branch', contactBankForm.bank_branch)
      payload.append('ifsc_code', contactBankForm.ifsc_code)
      payload.append('account_number', contactBankForm.account_number)
      payload.append('is_account_holder_different', String(contactBankForm.is_account_holder_different))
      if (contactBankForm.account_holder_aadhar_card) {
        payload.append('account_holder_aadhar_card', contactBankForm.account_holder_aadhar_card)
      }
      await erpFetch(`/api/employees/${employee?.id}/contact-bank`, {
        method: 'PUT',
        body: payload,
      })
      setShowEditContactBank(false)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save contact/bank details')
    }
  }

  const actOnRequest = async (requestId: string, action: 'approve' | 'reject') => {
    setError(null)
    try {
      await erpFetch(`/api/employees/status-requests/${requestId}/${action}`, {
        method: 'POST',
      })
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} request`)
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Employee Details</h1>
          <p className="text-gray-600 mt-1">View full employee information</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/hr">Back to Employees</Link>
        </Button>
      </div>

      {loading ? <p className="text-gray-600">Loading employee...</p> : null}
      {error ? <p className="text-red-600">{error}</p> : null}

      {!loading && !error && employee ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {employee.employee_code} - {employee.full_name || 'Employee'}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <p>
              <span className="font-medium">Employee ID:</span> {employee.employee_code}
            </p>
            <p>
              <span className="font-medium">Name:</span> {employee.full_name || '-'}
            </p>
            <p>
              <span className="font-medium">Date of Birth:</span> {employee.date_of_birth || '-'}
            </p>
            <p>
              <span className="font-medium">Department:</span> {employee.department || '-'}
            </p>
            <p>
              <span className="font-medium">Position:</span> {employee.position || '-'}
            </p>
            <p>
              <span className="font-medium">Date of Hire:</span> {employee.date_of_hire || '-'}
            </p>
            <p>
              <span className="font-medium">Salary (CTC):</span> {employee.salary_ctc ?? '-'}
            </p>
            <p>
              <span className="font-medium">Salary (In Hand):</span> {employee.salary_in_hand ?? '-'}
            </p>
            <p>
              <span className="font-medium">Status:</span>{' '}
              {employee.status === 'deboarded' ? 'Deboarded' : 'Active Employee'}
            </p>
            <div className="md:col-span-2 flex flex-wrap gap-2">
              {employee.status !== 'deboarded' ? (
                <Button variant="destructive" onClick={() => setShowDeboardForm((v) => !v)}>
                  De-board
                </Button>
              ) : (
                <Button onClick={() => setShowRehireForm((v) => !v)}>Re-hire</Button>
              )}
              <Button variant="outline" onClick={() => setShowEditContactBank((v) => !v)}>
                Edit Contact / Bank Details
              </Button>
            </div>

            {showDeboardForm ? (
              <form className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3 border rounded-md p-3" onSubmit={submitDeboard}>
                <p className="md:col-span-2 font-medium">Deboard Request</p>
                <label className="flex flex-col gap-1">
                  Type
                  <select
                    className="h-10 rounded-md border px-3 bg-background"
                    value={deboardForm.reason_type}
                    onChange={(e) => setDeboardForm((p) => ({ ...p, reason_type: e.target.value }))}
                  >
                    <option>Company initiated Removal</option>
                    <option>Employee initiated Resignation</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  Date of Deboard
                  <input
                    type="date"
                    className="h-10 rounded-md border px-3 bg-background"
                    value={deboardForm.effective_date}
                    onChange={(e) => setDeboardForm((p) => ({ ...p, effective_date: e.target.value }))}
                  />
                </label>
                <label className="md:col-span-2 flex flex-col gap-1">
                  Description of reason
                  <textarea
                    className="rounded-md border px-3 py-2 bg-background"
                    rows={3}
                    value={deboardForm.reason_description}
                    onChange={(e) => setDeboardForm((p) => ({ ...p, reason_description: e.target.value }))}
                    required
                  />
                </label>
                <div className="md:col-span-2 flex justify-end">
                  <Button type="submit">Submit (requires admin approval)</Button>
                </div>
              </form>
            ) : null}

            {showRehireForm ? (
              <form className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3 border rounded-md p-3" onSubmit={submitRehire}>
                <p className="md:col-span-2 font-medium">Re-hire Request</p>
                <label className="flex flex-col gap-1">
                  Date of re-hire
                  <input
                    type="date"
                    className="h-10 rounded-md border px-3 bg-background"
                    value={rehireForm.date_of_rehire}
                    onChange={(e) => setRehireForm((p) => ({ ...p, date_of_rehire: e.target.value }))}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1">
                  Department
                  <select
                    className="h-10 rounded-md border px-3 bg-background"
                    value={rehireForm.department}
                    onChange={(e) => setRehireForm((p) => ({ ...p, department: e.target.value }))}
                    required
                  >
                    <option value="">Select department</option>
                    {departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  Position
                  <input
                    className="h-10 rounded-md border px-3 bg-background"
                    value={rehireForm.position}
                    onChange={(e) => setRehireForm((p) => ({ ...p, position: e.target.value }))}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1">
                  Salary CTC
                  <input
                    type="number"
                    className="h-10 rounded-md border px-3 bg-background"
                    value={rehireForm.salary_ctc}
                    onChange={(e) => setRehireForm((p) => ({ ...p, salary_ctc: e.target.value }))}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1">
                  Salary In-hand
                  <input
                    type="number"
                    className="h-10 rounded-md border px-3 bg-background"
                    value={rehireForm.salary_in_hand}
                    onChange={(e) => setRehireForm((p) => ({ ...p, salary_in_hand: e.target.value }))}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1">
                  Account Holder Name
                  <input
                    className="h-10 rounded-md border px-3 bg-background"
                    value={rehireForm.account_holder_name}
                    onChange={(e) => setRehireForm((p) => ({ ...p, account_holder_name: e.target.value }))}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1">
                  Bank Name
                  <input
                    className="h-10 rounded-md border px-3 bg-background"
                    value={rehireForm.bank_name}
                    onChange={(e) => setRehireForm((p) => ({ ...p, bank_name: e.target.value }))}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1">
                  Bank Branch
                  <input
                    className="h-10 rounded-md border px-3 bg-background"
                    value={rehireForm.bank_branch}
                    onChange={(e) => setRehireForm((p) => ({ ...p, bank_branch: e.target.value }))}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1">
                  IFSC Code
                  <input
                    className="h-10 rounded-md border px-3 bg-background"
                    value={rehireForm.ifsc_code}
                    onChange={(e) => setRehireForm((p) => ({ ...p, ifsc_code: e.target.value }))}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1">
                  Account Number
                  <input
                    className="h-10 rounded-md border px-3 bg-background"
                    value={rehireForm.account_number}
                    onChange={(e) => setRehireForm((p) => ({ ...p, account_number: e.target.value }))}
                    required
                  />
                </label>
                <label className="md:col-span-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={rehireForm.is_account_holder_different}
                    onChange={(e) => setRehireForm((p) => ({ ...p, is_account_holder_different: e.target.checked }))}
                  />
                  Is Account holder different from Employee
                </label>
                <label className="flex flex-col gap-1">
                  Aadhar Card
                  <input type="file" onChange={(e) => setRehireForm((p) => ({ ...p, aadhar_card: e.target.files?.[0] ?? null }))} />
                </label>
                <label className="flex flex-col gap-1">
                  PAN Card (optional)
                  <input type="file" onChange={(e) => setRehireForm((p) => ({ ...p, pan_card: e.target.files?.[0] ?? null }))} />
                </label>
                <label className="flex flex-col gap-1">
                  Bank Document
                  <input type="file" onChange={(e) => setRehireForm((p) => ({ ...p, bank_proof: e.target.files?.[0] ?? null }))} />
                </label>
                {rehireForm.is_account_holder_different ? (
                  <label className="flex flex-col gap-1">
                    Account Holder Aadhar
                    <input
                      type="file"
                      onChange={(e) =>
                        setRehireForm((p) => ({ ...p, account_holder_aadhar_card: e.target.files?.[0] ?? null }))
                      }
                    />
                  </label>
                ) : null}
                <div className="md:col-span-2 flex justify-end">
                  <Button type="submit">Submit (requires admin approval)</Button>
                </div>
              </form>
            ) : null}

            {showEditContactBank ? (
              <form className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3 border rounded-md p-3" onSubmit={submitContactBank}>
                <p className="md:col-span-2 font-medium">Edit Contact / Bank Details</p>
                <label className="md:col-span-2 flex flex-col gap-1">
                  Address
                  <input
                    className="h-10 rounded-md border px-3 bg-background"
                    value={contactBankForm.address}
                    onChange={(e) => setContactBankForm((p) => ({ ...p, address: e.target.value }))}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1">
                  Phone Numbers (comma separated)
                  <input
                    className="h-10 rounded-md border px-3 bg-background"
                    value={contactBankForm.phone_numbers}
                    onChange={(e) => setContactBankForm((p) => ({ ...p, phone_numbers: e.target.value }))}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1">
                  Email (optional)
                  <input
                    className="h-10 rounded-md border px-3 bg-background"
                    value={contactBankForm.email}
                    onChange={(e) => setContactBankForm((p) => ({ ...p, email: e.target.value }))}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  Account Holder Name
                  <input
                    className="h-10 rounded-md border px-3 bg-background"
                    value={contactBankForm.account_holder_name}
                    onChange={(e) => setContactBankForm((p) => ({ ...p, account_holder_name: e.target.value }))}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1">
                  Bank Name
                  <input
                    className="h-10 rounded-md border px-3 bg-background"
                    value={contactBankForm.bank_name}
                    onChange={(e) => setContactBankForm((p) => ({ ...p, bank_name: e.target.value }))}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1">
                  Bank Branch
                  <input
                    className="h-10 rounded-md border px-3 bg-background"
                    value={contactBankForm.bank_branch}
                    onChange={(e) => setContactBankForm((p) => ({ ...p, bank_branch: e.target.value }))}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1">
                  IFSC Code
                  <input
                    className="h-10 rounded-md border px-3 bg-background"
                    value={contactBankForm.ifsc_code}
                    onChange={(e) => setContactBankForm((p) => ({ ...p, ifsc_code: e.target.value }))}
                    required
                  />
                </label>
                <label className="md:col-span-2 flex flex-col gap-1">
                  Account Number
                  <input
                    className="h-10 rounded-md border px-3 bg-background"
                    value={contactBankForm.account_number}
                    onChange={(e) => setContactBankForm((p) => ({ ...p, account_number: e.target.value }))}
                    required
                  />
                </label>
                <label className="md:col-span-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={contactBankForm.is_account_holder_different}
                    onChange={(e) =>
                      setContactBankForm((p) => ({ ...p, is_account_holder_different: e.target.checked }))
                    }
                  />
                  Is Account holder different from Employee
                </label>
                {contactBankForm.is_account_holder_different ? (
                  <label className="md:col-span-2 flex flex-col gap-1">
                    Account Holder Aadhar Card
                    <input
                      type="file"
                      onChange={(e) =>
                        setContactBankForm((p) => ({ ...p, account_holder_aadhar_card: e.target.files?.[0] ?? null }))
                      }
                    />
                  </label>
                ) : null}
                <div className="md:col-span-2 flex justify-end">
                  <Button type="submit">Save Contact / Bank</Button>
                </div>
              </form>
            ) : null}

            <div className="md:col-span-2">
              <p className="font-medium mb-2">Status Requests</p>
              <div className="space-y-2">
                {(employee.status_requests ?? []).map((request) => (
                  <div key={request.id} className="rounded-md border p-3">
                    <p className="text-sm">
                      {request.request_type.toUpperCase()} | {request.status.toUpperCase()} | Effective:{' '}
                      {request.effective_date ?? '-'}
                    </p>
                    {request.reason_type ? <p className="text-sm text-muted-foreground">{request.reason_type}</p> : null}
                    {request.reason_description ? (
                      <p className="text-sm text-muted-foreground">{request.reason_description}</p>
                    ) : null}
                    {isAdmin && request.status === 'pending' ? (
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" onClick={() => void actOnRequest(request.id, 'approve')}>
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => void actOnRequest(request.id, 'reject')}>
                          Reject
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="md:col-span-2 grid gap-4 pt-2">
              <div className="rounded-md border p-3">
                <p className="font-medium mb-2">Aadhar Card Preview</p>
                {employee.document_urls?.aadhar_card ? (
                  isImageUrl(employee.document_urls.aadhar_card) ? (
                    <img
                      src={employee.document_urls.aadhar_card}
                      alt="Aadhar Card"
                      className="max-h-[500px] w-auto rounded border"
                    />
                  ) : (
                    <iframe
                      title="Aadhar Card Preview"
                      src={employee.document_urls.aadhar_card}
                      className="h-[500px] w-full rounded border"
                    />
                  )
                ) : (
                  <p className="text-muted-foreground">No Aadhar Card document available.</p>
                )}
              </div>

              <div className="rounded-md border p-3">
                <p className="font-medium mb-2">PAN Card Preview</p>
                {employee.document_urls?.pan_card ? (
                  isImageUrl(employee.document_urls.pan_card) ? (
                    <img
                      src={employee.document_urls.pan_card}
                      alt="PAN Card"
                      className="max-h-[500px] w-auto rounded border"
                    />
                  ) : (
                    <iframe
                      title="PAN Card Preview"
                      src={employee.document_urls.pan_card}
                      className="h-[500px] w-full rounded border"
                    />
                  )
                ) : (
                  <p className="text-muted-foreground">No PAN Card document available.</p>
                )}
              </div>

              <div className="rounded-md border p-3">
                <p className="font-medium mb-2">Bank Document Preview</p>
                {employee.document_urls?.bank_document ? (
                  isImageUrl(employee.document_urls.bank_document) ? (
                    <img
                      src={employee.document_urls.bank_document}
                      alt="Bank Document"
                      className="max-h-[500px] w-auto rounded border"
                    />
                  ) : (
                    <iframe
                      title="Bank Document Preview"
                      src={employee.document_urls.bank_document}
                      className="h-[500px] w-full rounded border"
                    />
                  )
                ) : (
                  <p className="text-muted-foreground">No Bank Document available.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
