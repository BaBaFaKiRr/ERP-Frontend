'use client'

import { type FormEvent, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

const initialForm = {
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
}

function FieldLabel({
  htmlFor,
  children,
  required = false,
}: {
  htmlFor?: string
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <Label htmlFor={htmlFor} className="mb-1 block text-sm font-medium">
      {children}
      {required ? ' *' : null}
    </Label>
  )
}

const selectClassName =
  'w-full h-10 rounded-md border border-gray-300 px-3 bg-white dark:border-slate-600 dark:bg-slate-900'

const fileClassName =
  'w-full h-10 rounded-md border px-3 bg-background file:mr-3 file:border-0 file:bg-transparent'

export default function AddEmployeePage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState(initialForm)

  const salaryWarning = useMemo(() => {
    const ctc = Number(form.salary_ctc)
    const inHand = Number(form.salary_in_hand)
    if (!Number.isFinite(ctc) || !Number.isFinite(inHand) || ctc <= 0 || inHand <= 0) return null
    return inHand >= ctc ? 'In-hand salary must be less than CTC.' : null
  }, [form.salary_ctc, form.salary_in_hand])

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
      if (form.account_holder_aadhar_card) {
        payload.append('account_holder_aadhar_card', form.account_holder_aadhar_card)
      }

      const res = await erpFetch<{ data: { employee_code?: string } }>('/api/employees', {
        method: 'POST',
        body: payload,
      })

      const code = res.data?.employee_code
      if (code) {
        router.push(`/dashboard/hr/${code}`)
      } else {
        router.push('/dashboard/hr/employees')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create employee')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="sm" asChild className="gap-2">
          <Link href="/dashboard/hr/employees">
            <ArrowLeft size={18} />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Add employee</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a standalone employee profile (ERP user not required)
          </p>
        </div>
      </div>

      {error ? (
        <Card className="mb-6 border-red-300 bg-red-50">
          <CardContent className="pt-6 text-red-700">{error}</CardContent>
        </Card>
      ) : null}

      <form onSubmit={handleCreateEmployee} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Personal details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel htmlFor="full_name" required>
                Name
              </FieldLabel>
              <Input
                id="full_name"
                value={form.full_name}
                onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
                required
              />
            </div>
            <div>
              <FieldLabel htmlFor="date_of_birth" required>
                Date of birth
              </FieldLabel>
              <Input
                id="date_of_birth"
                type="date"
                value={form.date_of_birth}
                onChange={(e) => setForm((prev) => ({ ...prev, date_of_birth: e.target.value }))}
                required
              />
            </div>
            <div>
              <FieldLabel htmlFor="department" required>
                Department
              </FieldLabel>
              <select
                id="department"
                className={selectClassName}
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
            </div>
            <div>
              <FieldLabel htmlFor="position">Position</FieldLabel>
              <Input
                id="position"
                value={form.position}
                onChange={(e) => setForm((prev) => ({ ...prev, position: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <FieldLabel htmlFor="address" required>
                Address
              </FieldLabel>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                required
              />
            </div>
            <div>
              <FieldLabel htmlFor="phone_numbers" required>
                Phone numbers
              </FieldLabel>
              <Input
                id="phone_numbers"
                value={form.phone_numbers}
                onChange={(e) => setForm((prev) => ({ ...prev, phone_numbers: e.target.value }))}
                placeholder="9876543210, 9123456780"
                required
              />
            </div>
            <div>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Employment & salary</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel htmlFor="date_of_hire" required>
                Date of hire
              </FieldLabel>
              <Input
                id="date_of_hire"
                type="date"
                value={form.date_of_hire}
                onChange={(e) => setForm((prev) => ({ ...prev, date_of_hire: e.target.value }))}
                required
              />
            </div>
            <div />
            <div>
              <FieldLabel htmlFor="salary_ctc" required>
                Salary (CTC)
              </FieldLabel>
              <Input
                id="salary_ctc"
                type="number"
                min="1"
                step="0.01"
                value={form.salary_ctc}
                onChange={(e) => setForm((prev) => ({ ...prev, salary_ctc: e.target.value }))}
                required
              />
            </div>
            <div>
              <FieldLabel htmlFor="salary_in_hand" required>
                Salary (in hand)
              </FieldLabel>
              <Input
                id="salary_in_hand"
                type="number"
                min="1"
                step="0.01"
                value={form.salary_in_hand}
                onChange={(e) => setForm((prev) => ({ ...prev, salary_in_hand: e.target.value }))}
                required
              />
            </div>
            {salaryWarning ? (
              <p className="md:col-span-2 text-sm text-red-600">{salaryWarning}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
            <CardDescription>Upload identity and bank proof files.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel htmlFor="aadhar_card" required>
                Aadhar card
              </FieldLabel>
              <input
                id="aadhar_card"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                className={fileClassName}
                onChange={(e) => setForm((prev) => ({ ...prev, aadhar_card: e.target.files?.[0] ?? null }))}
                required
              />
            </div>
            <div>
              <FieldLabel htmlFor="pan_card">Pan card</FieldLabel>
              <input
                id="pan_card"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                className={fileClassName}
                onChange={(e) => setForm((prev) => ({ ...prev, pan_card: e.target.files?.[0] ?? null }))}
              />
            </div>
            <div className="md:col-span-2">
              <FieldLabel htmlFor="bank_proof" required>
                Bank proof (cheque/passbook)
              </FieldLabel>
              <input
                id="bank_proof"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                className={fileClassName}
                onChange={(e) => setForm((prev) => ({ ...prev, bank_proof: e.target.files?.[0] ?? null }))}
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bank details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel htmlFor="account_holder_name" required>
                Account holder name
              </FieldLabel>
              <Input
                id="account_holder_name"
                value={form.account_holder_name}
                onChange={(e) => setForm((prev) => ({ ...prev, account_holder_name: e.target.value }))}
                required
              />
            </div>
            <div>
              <FieldLabel htmlFor="bank_name" required>
                Bank name
              </FieldLabel>
              <Input
                id="bank_name"
                value={form.bank_name}
                onChange={(e) => setForm((prev) => ({ ...prev, bank_name: e.target.value }))}
                required
              />
            </div>
            <div>
              <FieldLabel htmlFor="bank_branch" required>
                Bank branch
              </FieldLabel>
              <Input
                id="bank_branch"
                value={form.bank_branch}
                onChange={(e) => setForm((prev) => ({ ...prev, bank_branch: e.target.value }))}
                required
              />
            </div>
            <div>
              <FieldLabel htmlFor="ifsc_code" required>
                IFSC code
              </FieldLabel>
              <Input
                id="ifsc_code"
                value={form.ifsc_code}
                onChange={(e) => setForm((prev) => ({ ...prev, ifsc_code: e.target.value }))}
                required
              />
            </div>
            <div className="md:col-span-2">
              <FieldLabel htmlFor="account_number" required>
                Account number
              </FieldLabel>
              <Input
                id="account_number"
                value={form.account_number}
                onChange={(e) => setForm((prev) => ({ ...prev, account_number: e.target.value }))}
                required
              />
            </div>
            <label className="md:col-span-2 flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_account_holder_different}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, is_account_holder_different: e.target.checked }))
                }
              />
              Account holder is different from employee
            </label>
            {form.is_account_holder_different ? (
              <div className="md:col-span-2">
                <FieldLabel htmlFor="account_holder_aadhar" required>
                  Account holder Aadhar card
                </FieldLabel>
                <input
                  id="account_holder_aadhar"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  className={fileClassName}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      account_holder_aadhar_card: e.target.files?.[0] ?? null,
                    }))
                  }
                  required
                />
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard/hr/employees">Cancel</Link>
          </Button>
          <Button type="submit" disabled={submitting || Boolean(salaryWarning)}>
            {submitting ? 'Saving…' : 'Create employee'}
          </Button>
        </div>
      </form>
    </div>
  )
}