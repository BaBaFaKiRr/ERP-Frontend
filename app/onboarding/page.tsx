'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { erpFetch } from '@/lib/erp-api'
import type { MeResponse, OnboardingState } from '@/lib/organization-store'
import { completeChecklistIntro, setActiveOrganizationId } from '@/lib/organization-store'
import { OnboardingChecklist } from '@/components/onboarding/onboarding-checklist'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const WIZARD_STEPS = [
  { id: 1, label: 'Your profile' },
  { id: 2, label: 'Organization' },
  { id: 3, label: 'Getting started' },
] as const

const INDUSTRIES = [
  'Manufacturing',
  'Automotive components',
  'Electronics',
  'FMCG',
  'Pharmaceuticals',
  'Textiles',
  'Other',
]

const BUSINESS_TYPES = [
  'Private limited',
  'Public limited',
  'Partnership',
  'Proprietorship',
  'LLP',
]

const MONTHS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [checklist, setChecklist] = useState<OnboardingState | null>(null)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [designation, setDesignation] = useState('')
  const [phone, setPhone] = useState('')

  const [companyName, setCompanyName] = useState('')
  const [gstin, setGstin] = useState('')
  const [industry, setIndustry] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [fiscalMonth, setFiscalMonth] = useState('4')
  const [currency, setCurrency] = useState('INR')
  const [timezone, setTimezone] = useState('Asia/Kolkata')
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [country, setCountry] = useState('India')

  const loadChecklist = useCallback(async () => {
    try {
      const data = await erpFetch<OnboardingState>('/api/onboarding')
      setChecklist(data)
    } catch {
      setChecklist(null)
    }
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        const me = await erpFetch<MeResponse>('/api/me')
        const needsSetup =
          me.onboarding?.needsSetupWizard ?? me.onboarding?.needsWizard ?? false

        setFirstName(me.user.firstName ?? '')
        setLastName(me.user.lastName ?? '')
        setPhone(me.user.phone ?? '')
        setDesignation(me.user.designation ?? '')

        if (me.organizations.length > 0) {
          const orgId = me.activeOrganization?.id ?? me.organizations[0]?.id
          if (orgId) setActiveOrganizationId(orgId)
          if (needsSetup) {
            setStep(me.onboarding?.wizardStep && me.onboarding.wizardStep > 1 ? 2 : 1)
          } else {
            setStep(3)
            await loadChecklist()
          }
        } else {
          setStep(needsSetup ? (me.onboarding?.wizardStep <= 1 ? 1 : 2) : 1)
        }
      } catch {
        setError('Could not load your profile. Please sign in again.')
      } finally {
        setLoading(false)
      }
    })()
  }, [loadChecklist])

  const continueToDashboard = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await completeChecklistIntro((path, init) => erpFetch(path, init))
      router.replace('/dashboard')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not continue to dashboard')
    } finally {
      setSubmitting(false)
    }
  }

  const saveProfile = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await erpFetch('/api/me/profile', {
        method: 'PATCH',
        body: { firstName, lastName, designation, phone },
      })
      setStep(2)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save profile')
    } finally {
      setSubmitting(false)
    }
  }

  const createOrganization = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const res = await erpFetch<{ organization: { id: string } }>('/api/organizations', {
        method: 'POST',
        body: {
          name: companyName.trim(),
          gstin: gstin.trim() || null,
          industry: industry || null,
          businessType: businessType || null,
          fiscalYearStartMonth: Number(fiscalMonth),
          baseCurrency: currency,
          timezone,
          address: {
            line1: addressLine1,
            line2: addressLine2,
            city,
            state,
            postalCode,
            country,
          },
        },
      })
      setActiveOrganizationId(res.organization.id)
      setStep(3)
      await loadChecklist()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create organization')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <p className="text-muted-foreground text-center text-sm">Preparing your workspace…</p>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#0f172a] dark:text-white">
          Welcome to LEJER
        </h1>
        <p className="mt-2 text-sm text-[#64748b] dark:text-slate-400">
          A few quick steps to set up your manufacturing ERP workspace. You can leave anytime and
          continue from the dashboard.
        </p>
      </div>

      <nav aria-label="Setup progress" className="flex gap-2">
        {WIZARD_STEPS.map((s) => (
          <div
            key={s.id}
            className={cn(
              'flex-1 rounded-md border px-3 py-2 text-center text-xs font-medium transition-colors',
              step === s.id
                ? 'border-[#2563eb] bg-[#eff6ff] text-[#2563eb] dark:bg-[#1e3a5f]/40'
                : step > s.id
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-300'
                  : 'border-[#e2e8f0] text-[#94a3b8] dark:border-white/10',
            )}
          >
            {s.label}
          </div>
        ))}
      </nav>

      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>Tell us about you</CardTitle>
            <CardDescription>
              We use this for approvals, audit trails, and team invitations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault()
                void saveProfile()
              }}
            >
              <div className="grid gap-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="designation">Designation</Label>
                <Input
                  id="designation"
                  placeholder="e.g. Operations Manager"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <div className="flex justify-end gap-2 sm:col-span-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving…' : 'Continue'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>Your organization</CardTitle>
            <CardDescription>
              Company details power GST documents, fiscal reporting, and multi-warehouse operations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault()
                void createOrganization()
              }}
            >
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="companyName">Company name</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="gstin">GSTIN (optional)</Label>
                <Input
                  id="gstin"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                />
              </div>
              <div className="grid gap-2">
                <Label>Industry</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Business type</Label>
                <Select value={businessType} onValueChange={setBusinessType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_TYPES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Fiscal year starts</Label>
                <Select value={fiscalMonth} onValueChange={setFiscalMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="currency">Base currency</Label>
                <Input id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="address1">Address</Label>
                <Textarea
                  id="address1"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="Street, building, plot"
                  rows={2}
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="address2">Address line 2 (optional)</Label>
                <Input
                  id="address2"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" value={state} onChange={(e) => setState(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="postal">Postal code</Label>
                <Input
                  id="postal"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="country">Country</Label>
                <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} />
              </div>
              <div className="flex justify-between gap-2 sm:col-span-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button type="submit" disabled={submitting || !companyName.trim()}>
                  {submitting ? 'Creating workspace…' : 'Create organization'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {step === 3 && checklist ? (
        <Card>
          <CardHeader>
            <CardTitle>Your setup checklist</CardTitle>
            <CardDescription>
              Track progress as you import data and configure modules. Tasks complete automatically
              when LEJER detects the underlying records.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <OnboardingChecklist state={checklist} onRefresh={loadChecklist} />
            <div className="flex justify-end">
              <Button type="button" disabled={submitting} onClick={() => void continueToDashboard()}>
                {submitting ? 'Continuing…' : 'Continue to dashboard'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step < 3 ? (
        <p className="text-center text-xs text-[#64748b] dark:text-slate-400">
          <button
            type="button"
            className="underline underline-offset-2 hover:text-[#334155]"
            onClick={() => router.replace('/dashboard')}
          >
            Skip for now and open dashboard
          </button>
        </p>
      ) : null}
    </div>
  )
}
