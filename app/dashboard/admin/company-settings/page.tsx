'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Building2, FileText, Landmark, ShoppingCart } from 'lucide-react'
import { useOrganization } from '@/lib/organization-context'
import { erpFetch } from '@/lib/erp-api'
import {
  InvoiceProfilesSection,
  type InvoiceSettingProfile,
} from '@/components/settings/invoice-profiles-section'
import { SettingsPageShell } from '@/components/settings/settings-page-shell'
import { SettingsSectionGrid } from '@/components/settings/settings-split-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type OrgAddress = {
  line1?: string
  line2?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
}

type OrganizationDetails = {
  id: string
  name: string
  slug: string
  status: string
  subscriptionPlan: string
  gstin: string | null
  industry: string | null
  businessType: string | null
  fiscalYearStartMonth: number | null
  baseCurrency: string
  timezone: string
  address: OrgAddress
}

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

function defaultAlias(profiles: InvoiceSettingProfile[], type: InvoiceSettingProfile['setting_type']) {
  return profiles.find((p) => p.setting_type === type && p.is_default)?.alias ?? 'Not set'
}

export default function CompanySettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading…</div>}>
      <CompanySettingsPageContent />
    </Suspense>
  )
}

function CompanySettingsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromSettings = searchParams.get('from') === 'settings'
  const { membershipRole, moduleRoles, loading: orgLoading, refresh } = useOrganization()

  const isOrgAdmin = useMemo(() => {
    if (membershipRole === 'owner' || membershipRole === 'admin') return true
    return moduleRoles.includes('erp_admin')
  }, [membershipRole, moduleRoles])

  const [org, setOrg] = useState<OrganizationDetails | null>(null)
  const [profiles, setProfiles] = useState<InvoiceSettingProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const [name, setName] = useState('')
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

  useEffect(() => {
    if (orgLoading) return
    if (!isOrgAdmin) {
      router.replace('/dashboard')
    }
  }, [orgLoading, isOrgAdmin, router])

  const applyOrg = (data: OrganizationDetails) => {
    setOrg(data)
    setName(data.name)
    setGstin(data.gstin ?? '')
    setIndustry(data.industry ?? '')
    setBusinessType(data.businessType ?? '')
    setFiscalMonth(String(data.fiscalYearStartMonth ?? 4))
    setCurrency(data.baseCurrency || 'INR')
    setTimezone(data.timezone || 'Asia/Kolkata')
    setAddressLine1(data.address.line1 ?? '')
    setAddressLine2(data.address.line2 ?? '')
    setCity(data.address.city ?? '')
    setState(data.address.state ?? '')
    setPostalCode(data.address.postalCode ?? '')
    setCountry(data.address.country ?? 'India')
  }

  useEffect(() => {
    if (!isOrgAdmin) return
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await erpFetch<{ organization: OrganizationDetails }>('/api/organizations/current')
        applyOrg(res.organization)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load organization')
      } finally {
        setLoading(false)
      }
    })()
  }, [isOrgAdmin])

  const saveOrganization = async () => {
    if (!name.trim()) {
      setError('Company name is required.')
      return
    }
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const res = await erpFetch<{ organization: OrganizationDetails }>('/api/organizations/current', {
        method: 'PATCH',
        body: {
          name: name.trim(),
          gstin: gstin.trim() || null,
          industry: industry.trim() || null,
          businessType: businessType.trim() || null,
          fiscalYearStartMonth: Number(fiscalMonth),
          baseCurrency: currency.trim(),
          timezone: timezone.trim(),
          address: {
            line1: addressLine1.trim(),
            line2: addressLine2.trim(),
            city: city.trim(),
            state: state.trim(),
            postalCode: postalCode.trim(),
            country: country.trim(),
          },
        },
      })
      applyOrg(res.organization)
      setMessage('Organization details saved.')
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save organization')
    } finally {
      setSaving(false)
    }
  }

  const backHref = fromSettings ? '/dashboard/settings' : '/dashboard/admin'
  const backLabel = fromSettings ? 'Back to Settings' : 'Back to Admin Panel'

  return (
    <SettingsPageShell
      title="Company Settings"
      description="Configure your organization identity, business preferences, and invoice profiles used across accounts and sales documents."
      backLink={{ href: backHref, label: backLabel }}
      status={
        <>
          {loading ? <p className="text-sm text-muted-foreground">Loading company settings...</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {message ? <p className="text-sm text-green-600">{message}</p> : null}
        </>
      }
    >
      <SettingsSectionGrid columns={3}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="size-4 text-muted-foreground" />
              Default Company
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{defaultAlias(profiles, 'company')}</p>
            <p className="text-xs text-muted-foreground">Invoice company profile</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Landmark className="size-4 text-muted-foreground" />
              Default Bank
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{defaultAlias(profiles, 'bank')}</p>
            <p className="text-xs text-muted-foreground">Invoice bank profile</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-4 text-muted-foreground" />
              Default Terms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{defaultAlias(profiles, 'terms')}</p>
            <p className="text-xs text-muted-foreground">Invoice TNC profile</p>
          </CardContent>
        </Card>
      </SettingsSectionGrid>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Organization Details</h2>
          <p className="text-sm text-muted-foreground">Workspace identity and registered business information.</p>
        </div>

        <SettingsSectionGrid columns={2}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Company Identity</CardTitle>
              <CardDescription>Legal and commercial identifiers</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="company-name">Company name</Label>
                <Input id="company-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gstin">GSTIN</Label>
                <Input id="gstin" value={gstin} onChange={(e) => setGstin(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="slug">Workspace slug</Label>
                <Input id="slug" value={org?.slug ?? ''} readOnly className="bg-muted/40" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="industry">Industry</Label>
                <Input id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="business-type">Business type</Label>
                <Input id="business-type" value={businessType} onChange={(e) => setBusinessType(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Business Preferences</CardTitle>
              <CardDescription>Fiscal calendar and regional defaults</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
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
              <div className="space-y-1.5">
                <Label htmlFor="currency">Base currency</Label>
                <Input id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="timezone">Timezone</Label>
                <Input id="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="plan">Subscription plan</Label>
                <Input id="plan" value={org?.subscriptionPlan ?? ''} readOnly className="bg-muted/40 capitalize" />
              </div>
            </CardContent>
          </Card>
        </SettingsSectionGrid>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registered Address</CardTitle>
            <CardDescription>Used for organization records and onboarding</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="line1">Address line 1</Label>
              <Input id="line1" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="line2">Address line 2</Label>
              <Input id="line2" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state">State</Label>
              <Input id="state" value={state} onChange={(e) => setState(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="postal">Postal code</Label>
              <Input id="postal" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="country">Country</Label>
              <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Button onClick={() => void saveOrganization()} disabled={saving || loading}>
                {saving ? 'Saving...' : 'Save Organization Details'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Accounts & Invoice Profiles</h2>
          <p className="text-sm text-muted-foreground">
            Manage terms, bank details, and company blocks used on invoices and sales documents.
          </p>
        </div>
        <InvoiceProfilesSection listTitle="Saved Profiles" onProfilesLoaded={setProfiles} />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Related Module Settings</h2>
          <p className="text-sm text-muted-foreground">Other reusable profiles for purchase and accounts modules.</p>
        </div>
        <SettingsSectionGrid columns={2}>
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingCart className="size-4 text-muted-foreground" />
                Purchase Settings
              </CardTitle>
              <CardDescription>PO terms, delivery and billing address profiles</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button variant="outline" className="w-full" asChild>
                <Link href="/dashboard/purchase/settings">
                  Open Purchase Settings
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-4 text-muted-foreground" />
                Accounts Settings
              </CardTitle>
              <CardDescription>Dedicated accounts module profile management</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button variant="outline" className="w-full" asChild>
                <Link href="/dashboard/finance/settings">
                  Open Accounts Settings
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </SettingsSectionGrid>
      </section>
    </SettingsPageShell>
  )
}
