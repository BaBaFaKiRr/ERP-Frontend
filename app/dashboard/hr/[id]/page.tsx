'use client'

import { type FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Copy, Check } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { useOrganization } from '@/lib/organization-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { EntityActivityLog } from '@/components/entity-activity-log'

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
  erp_access?: {
    hasLogin: boolean
    loginEmail: string | null
    pendingInvitation: {
      expiresAt: string
      inviteUrl: string
    } | null
  }
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
  const { membershipRole, moduleRoles, me } = useOrganization()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [inviteExpiresAt, setInviteExpiresAt] = useState<string | null>(null)
  const [inviteEmailSent, setInviteEmailSent] = useState<boolean | null>(null)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [revokeLoading, setRevokeLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showDeboardForm, setShowDeboardForm] = useState(false)
  const [showRehireForm, setShowRehireForm] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editForm, setEditForm] = useState({
    department: '',
    position: '',
    date_of_hire: '',
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
  const isOrgAdmin = useMemo(() => {
    if (membershipRole === 'owner' || membershipRole === 'admin') return true
    if (moduleRoles.includes('erp_admin')) return true
    return me?.user.role === 'admin'
  }, [membershipRole, moduleRoles, me?.user.role])

  const hasErpLogin = Boolean(employee?.erp_access?.hasLogin)
  const canInvite = isOrgAdmin && employee && !hasErpLogin && employee.status !== 'deboarded'

  const salaryEditWarning = useMemo(() => {
    const ctc = Number(editForm.salary_ctc)
    const inHand = Number(editForm.salary_in_hand)
    if (!Number.isFinite(ctc) || !Number.isFinite(inHand) || ctc <= 0 || inHand <= 0) return null
    return inHand >= ctc ? 'In-hand salary must be less than CTC.' : null
  }, [editForm.salary_ctc, editForm.salary_in_hand])

  function resetEditForm(data: Employee) {
    setEditForm({
      department: data.department ?? '',
      position: data.position ?? '',
      date_of_hire: data.date_of_hire ?? '',
      salary_ctc: data.salary_ctc != null ? String(data.salary_ctc) : '',
      salary_in_hand: data.salary_in_hand != null ? String(data.salary_in_hand) : '',
      aadhar_card: null,
      pan_card: null,
      bank_proof: null,
      address: data.contact?.address ?? '',
      phone_numbers: (data.contact?.phone_numbers ?? []).join(', '),
      email: data.contact?.email ?? '',
      account_holder_name: data.bank_details?.account_holder_name ?? '',
      bank_name: data.bank_details?.bank_name ?? '',
      bank_branch: data.bank_details?.bank_branch ?? '',
      ifsc_code: data.bank_details?.ifsc_code ?? '',
      account_number: data.bank_details?.account_number ?? '',
      is_account_holder_different: Boolean(data.bank_details?.is_account_holder_different),
      account_holder_aadhar_card: null,
    })
  }

  function closeAuxiliaryForms() {
    setShowDeboardForm(false)
    setShowRehireForm(false)
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await erpFetch<{ data: Employee }>(`/api/employees/by-code/${params.id}`)
        setEmployee(res.data)
        resetEditForm(res.data)
        if (res.data.erp_access?.pendingInvitation?.inviteUrl) {
          setInviteUrl(res.data.erp_access.pendingInvitation.inviteUrl)
          setInviteExpiresAt(res.data.erp_access.pendingInvitation.expiresAt ?? null)
        }
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
    resetEditForm(res.data)
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

  const submitEdit = async (e: FormEvent) => {
    e.preventDefault()
    if (!employee) return
    if (salaryEditWarning) {
      setError(salaryEditWarning)
      return
    }
    setSavingEdit(true)
    setError(null)
    try {
      const employeePayload = new FormData()
      employeePayload.append('department', editForm.department)
      employeePayload.append('position', editForm.position.trim())
      employeePayload.append('date_of_hire', editForm.date_of_hire)
      employeePayload.append('salary_ctc', editForm.salary_ctc)
      employeePayload.append('salary_in_hand', editForm.salary_in_hand)
      if (editForm.aadhar_card) employeePayload.append('aadhar_card', editForm.aadhar_card)
      if (editForm.pan_card) employeePayload.append('pan_card', editForm.pan_card)
      if (editForm.bank_proof) employeePayload.append('bank_proof', editForm.bank_proof)
      await erpFetch(`/api/employees/${employee.id}`, {
        method: 'PUT',
        body: employeePayload,
      })

      const contactPayload = new FormData()
      contactPayload.append('address', editForm.address)
      contactPayload.append('phone_numbers', editForm.phone_numbers)
      contactPayload.append('email', editForm.email)
      contactPayload.append('account_holder_name', editForm.account_holder_name)
      contactPayload.append('bank_name', editForm.bank_name)
      contactPayload.append('bank_branch', editForm.bank_branch)
      contactPayload.append('ifsc_code', editForm.ifsc_code)
      contactPayload.append('account_number', editForm.account_number)
      contactPayload.append('is_account_holder_different', String(editForm.is_account_holder_different))
      if (editForm.account_holder_aadhar_card) {
        contactPayload.append('account_holder_aadhar_card', editForm.account_holder_aadhar_card)
      }
      await erpFetch(`/api/employees/${employee.id}/contact-bank`, {
        method: 'PUT',
        body: contactPayload,
      })

      setShowEdit(false)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update employee')
    } finally {
      setSavingEdit(false)
    }
  }

  const createInvite = async () => {
    if (!employee) return
    setInviteLoading(true)
    setError(null)
    try {
      const res = await erpFetch<{ inviteUrl: string; expiresAt: string; emailSent?: boolean }>(
        `/api/employees/${employee.id}/invite`,
        { method: 'POST' },
      )
      setInviteUrl(res.inviteUrl)
      setInviteExpiresAt(res.expiresAt)
      setInviteEmailSent(res.emailSent ?? false)
      setInviteOpen(true)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invitation')
    } finally {
      setInviteLoading(false)
    }
  }

  const copyInviteLink = async () => {
    const link =
      inviteUrl ?? employee?.erp_access?.pendingInvitation?.inviteUrl ?? null
    if (!link) return
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const revokeLogin = async () => {
    if (!employee) return
    if (!window.confirm('Revoke ERP login for this employee? They will no longer be able to sign in.')) {
      return
    }
    setRevokeLoading(true)
    setError(null)
    try {
      await erpFetch(`/api/employees/${employee.id}/revoke-login`, { method: 'POST' })
      setInviteUrl(null)
      setInviteExpiresAt(null)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke login')
    } finally {
      setRevokeLoading(false)
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" className="gap-2 pl-0">
          <Link href="/dashboard/hr/employees">
            <ArrowLeft className="size-4" />
            Back to Employees
          </Link>
        </Button>
        {!loading && employee ? (
          <div className="flex flex-wrap items-center gap-2">
            {isOrgAdmin && hasErpLogin ? (
              <Button
                variant="outline"
                disabled={revokeLoading}
                onClick={() => void revokeLogin()}
              >
                {revokeLoading ? 'Revoking…' : 'Revoke login'}
              </Button>
            ) : null}
            {isOrgAdmin ? (
              <Button
                variant="outline"
                disabled={!canInvite || inviteLoading}
                className={cn(!canInvite && 'pointer-events-none opacity-50')}
                onClick={() => void createInvite()}
              >
                {inviteLoading
                  ? 'Generating…'
                  : employee.erp_access?.pendingInvitation
                    ? 'Regenerate invite link'
                    : 'Invite to ERP'}
              </Button>
            ) : null}
            {isOrgAdmin ? (
              <Button
                variant="outline"
                onClick={() => {
                  setShowEdit((v) => {
                    const next = !v
                    if (next) {
                      resetEditForm(employee)
                      closeAuxiliaryForms()
                    } else {
                      resetEditForm(employee)
                    }
                    return next
                  })
                }}
              >
                {showEdit ? 'Cancel edit' : 'Edit'}
              </Button>
            ) : null}
            {employee.status !== 'deboarded' ? (
              <Button
                variant="destructive"
                onClick={() => {
                  closeAuxiliaryForms()
                  setShowDeboardForm((v) => !v)
                  setShowEdit(false)
                }}
              >
                De-board
              </Button>
            ) : (
              <Button
                onClick={() => {
                  closeAuxiliaryForms()
                  setShowRehireForm((v) => !v)
                  setShowEdit(false)
                }}
              >
                Re-hire
              </Button>
            )}
          </div>
        ) : null}
      </div>

      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Employee Details</h1>
        <p className="mt-1 text-gray-600 dark:text-muted-foreground">View full employee information</p>
      </div>

      {loading ? <p className="text-gray-600">Loading employee...</p> : null}
      {error ? <p className="text-red-600">{error}</p> : null}

      {hasErpLogin && employee?.erp_access?.loginEmail ? (
        <p className="text-sm text-muted-foreground">
          ERP login email (sign-in):{' '}
          <span className="font-medium text-foreground">{employee.erp_access.loginEmail}</span>
          <span className="block text-xs">
            This is separate from the work contact email below. Changing contact email does not change ERP
            sign-in.
          </span>
        </p>
      ) : null}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite to LEJER ERP</DialogTitle>
            <DialogDescription>
              Share this one-time link with {employee?.full_name ?? 'the employee'}. Each new invite
              invalidates any previous link. Valid for 36 hours from when it was generated.
              {inviteEmailSent
                ? ' An invitation email was also sent to their work email address.'
                : inviteEmailSent === false
                  ? ' Email delivery is not configured — copy the link below and send it manually.'
                  : null}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input readOnly value={inviteUrl ?? ''} className="font-mono text-xs" />
              <Button type="button" variant="outline" size="icon" onClick={() => void copyInviteLink()}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </Button>
            </div>
            {inviteExpiresAt ? (
              <p className="text-muted-foreground text-xs">
                Expires: {new Date(inviteExpiresAt).toLocaleString('en-IN')}
              </p>
            ) : null}
            <p className="text-muted-foreground text-xs">
              The employee sets a password, verifies their email, then signs in to your organization
              workspace.
            </p>
          </div>
        </DialogContent>
      </Dialog>

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
            {!showEdit ? (
              <>
                <p className="md:col-span-2 font-medium pt-2">Contact</p>
                <p>
                  <span className="font-medium">Address:</span> {employee.contact?.address || '-'}
                </p>
                <p>
                  <span className="font-medium">Phone:</span>{' '}
                  {(employee.contact?.phone_numbers ?? []).join(', ') || '-'}
                </p>
                <p>
                  <span className="font-medium">Email:</span> {employee.contact?.email || '-'}
                </p>
                <p className="md:col-span-2 font-medium pt-2">Bank details</p>
                <p>
                  <span className="font-medium">Account holder:</span>{' '}
                  {employee.bank_details?.account_holder_name || '-'}
                </p>
                <p>
                  <span className="font-medium">Bank:</span> {employee.bank_details?.bank_name || '-'}
                </p>
                <p>
                  <span className="font-medium">Branch:</span> {employee.bank_details?.bank_branch || '-'}
                </p>
                <p>
                  <span className="font-medium">IFSC:</span> {employee.bank_details?.ifsc_code || '-'}
                </p>
                <p>
                  <span className="font-medium">Account number:</span>{' '}
                  {employee.bank_details?.account_number || '-'}
                </p>
                <p>
                  <span className="font-medium">Different account holder:</span>{' '}
                  {employee.bank_details?.is_account_holder_different ? 'Yes' : 'No'}
                </p>
              </>
            ) : null}

            {showEdit ? (
              <form
                className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3 border rounded-md p-3"
                onSubmit={submitEdit}
              >
                <p className="md:col-span-2 font-medium">Edit employee</p>
                <p className="md:col-span-2 text-xs text-muted-foreground">
                  Name, Employee ID, and Date of Birth cannot be changed after creation.
                </p>
                <label className="flex flex-col gap-1">
                  Employee ID
                  <input
                    className="h-10 rounded-md border px-3 bg-muted text-muted-foreground"
                    value={employee.employee_code}
                    readOnly
                    disabled
                  />
                </label>
                <label className="flex flex-col gap-1">
                  Name
                  <input
                    className="h-10 rounded-md border px-3 bg-muted text-muted-foreground"
                    value={employee.full_name ?? ''}
                    readOnly
                    disabled
                  />
                </label>
                <label className="flex flex-col gap-1">
                  Date of Birth
                  <input
                    type="date"
                    className="h-10 rounded-md border px-3 bg-muted text-muted-foreground"
                    value={employee.date_of_birth ?? ''}
                    readOnly
                    disabled
                  />
                </label>
                <label className="flex flex-col gap-1">
                  Department
                  <select
                    className="h-10 rounded-md border px-3 bg-background"
                    value={editForm.department}
                    onChange={(e) => setEditForm((p) => ({ ...p, department: e.target.value }))}
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
                    value={editForm.position}
                    onChange={(e) => setEditForm((p) => ({ ...p, position: e.target.value }))}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1">
                  Date of Hire
                  <input
                    type="date"
                    className="h-10 rounded-md border px-3 bg-background"
                    value={editForm.date_of_hire}
                    onChange={(e) => setEditForm((p) => ({ ...p, date_of_hire: e.target.value }))}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1">
                  Salary (CTC)
                  <input
                    type="number"
                    className="h-10 rounded-md border px-3 bg-background"
                    value={editForm.salary_ctc}
                    onChange={(e) => setEditForm((p) => ({ ...p, salary_ctc: e.target.value }))}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1">
                  Salary (In Hand)
                  <input
                    type="number"
                    className="h-10 rounded-md border px-3 bg-background"
                    value={editForm.salary_in_hand}
                    onChange={(e) => setEditForm((p) => ({ ...p, salary_in_hand: e.target.value }))}
                    required
                  />
                </label>
                {salaryEditWarning ? (
                  <p className="md:col-span-2 text-sm text-red-600">{salaryEditWarning}</p>
                ) : null}
                <label className="flex flex-col gap-1">
                  Replace Aadhar Card (optional)
                  <input
                    type="file"
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, aadhar_card: e.target.files?.[0] ?? null }))
                    }
                  />
                </label>
                <label className="flex flex-col gap-1">
                  Replace PAN Card (optional)
                  <input
                    type="file"
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, pan_card: e.target.files?.[0] ?? null }))
                    }
                  />
                </label>
                <label className="md:col-span-2 flex flex-col gap-1">
                  Replace Bank Document (optional)
                  <input
                    type="file"
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, bank_proof: e.target.files?.[0] ?? null }))
                    }
                  />
                </label>

                <p className="md:col-span-2 font-medium pt-2 border-t">Contact</p>
                <label className="md:col-span-2 flex flex-col gap-1">
                  Address
                  <input
                    className="h-10 rounded-md border px-3 bg-background"
                    value={editForm.address}
                    onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1">
                  Phone Numbers (comma separated)
                  <input
                    className="h-10 rounded-md border px-3 bg-background"
                    value={editForm.phone_numbers}
                    onChange={(e) => setEditForm((p) => ({ ...p, phone_numbers: e.target.value }))}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1">
                  Email (optional)
                  <input
                    className="h-10 rounded-md border px-3 bg-background"
                    value={editForm.email}
                    onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                  />
                </label>

                <p className="md:col-span-2 font-medium pt-2 border-t">Bank details</p>
                <label className="flex flex-col gap-1">
                  Account Holder Name
                  <input
                    className="h-10 rounded-md border px-3 bg-background"
                    value={editForm.account_holder_name}
                    onChange={(e) => setEditForm((p) => ({ ...p, account_holder_name: e.target.value }))}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1">
                  Bank Name
                  <input
                    className="h-10 rounded-md border px-3 bg-background"
                    value={editForm.bank_name}
                    onChange={(e) => setEditForm((p) => ({ ...p, bank_name: e.target.value }))}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1">
                  Bank Branch
                  <input
                    className="h-10 rounded-md border px-3 bg-background"
                    value={editForm.bank_branch}
                    onChange={(e) => setEditForm((p) => ({ ...p, bank_branch: e.target.value }))}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1">
                  IFSC Code
                  <input
                    className="h-10 rounded-md border px-3 bg-background"
                    value={editForm.ifsc_code}
                    onChange={(e) => setEditForm((p) => ({ ...p, ifsc_code: e.target.value }))}
                    required
                  />
                </label>
                <label className="md:col-span-2 flex flex-col gap-1">
                  Account Number
                  <input
                    className="h-10 rounded-md border px-3 bg-background"
                    value={editForm.account_number}
                    onChange={(e) => setEditForm((p) => ({ ...p, account_number: e.target.value }))}
                    required
                  />
                </label>
                <label className="md:col-span-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editForm.is_account_holder_different}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, is_account_holder_different: e.target.checked }))
                    }
                  />
                  Is Account holder different from Employee
                </label>
                {editForm.is_account_holder_different ? (
                  <label className="md:col-span-2 flex flex-col gap-1">
                    Account Holder Aadhar Card
                    <input
                      type="file"
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, account_holder_aadhar_card: e.target.files?.[0] ?? null }))
                      }
                    />
                  </label>
                ) : null}

                <div className="md:col-span-2 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowEdit(false)
                      resetEditForm(employee)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={savingEdit}>
                    {savingEdit ? 'Saving...' : 'Save changes'}
                  </Button>
                </div>
              </form>
            ) : null}

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
                    {isOrgAdmin && request.status === 'pending' ? (
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

      <EntityActivityLog entityType="employee" entityId={employee?.id} />
    </div>
  )
}
