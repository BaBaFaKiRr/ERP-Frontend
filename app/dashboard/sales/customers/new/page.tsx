'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'

type CustomerType = 'oem' | 'oe' | 'distributor' | 'export' | 'ecommerce' | ''

const TYPE_OPTIONS: { value: CustomerType; label: string }[] = [
  { value: 'oem', label: 'OEM' },
  { value: 'oe', label: 'OE' },
  { value: 'distributor', label: 'Distributor' },
  { value: 'export', label: 'Export' },
  { value: 'ecommerce', label: 'Ecommerce' },
]

export default function AddCustomerPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [customerType, setCustomerType] = useState<CustomerType>('')

  const [companyName, setCompanyName] = useState('')
  const [gstNo, setGstNo] = useState('')
  const [billingAddress, setBillingAddress] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [shippingAddress, setShippingAddress] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('')
  const [ecommercePlatform, setEcommercePlatform] = useState<'amazon' | 'flipkart' | 'direct' | ''>('')

  const resetBusinessFields = () => {
    setCompanyName('')
    setGstNo('')
    setBillingAddress('')
    setContactName('')
    setContactPhone('')
    setContactEmail('')
    setShippingAddress('')
    setPaymentTerms('')
    setEcommercePlatform('')
  }

  const handleTypeChange = (v: CustomerType) => {
    setCustomerType(v)
    resetBusinessFields()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerType) {
      alert('Select a customer type')
      return
    }

    let body: Record<string, unknown>

    if (customerType === 'ecommerce') {
      if (!ecommercePlatform) {
        alert('Select a platform')
        return
      }
      body = {
        customer_type: 'ecommerce',
        ecommerce_platform: ecommercePlatform,
      }
    } else {
      if (!companyName.trim()) {
        alert('Company name is required')
        return
      }
      if (!billingAddress.trim() || !contactName.trim() || !contactPhone.trim() || !contactEmail.trim()) {
        alert('Fill billing address, contact name, phone, and email')
        return
      }
      if (!shippingAddress.trim() || !paymentTerms.trim()) {
        alert('Fill shipping address and payment terms')
        return
      }
      if (customerType !== 'export' && !gstNo.trim()) {
        alert('GST number is required for OEM, OE, and Distributor')
        return
      }

      const base = {
        name: companyName.trim(),
        billing_address: billingAddress.trim(),
        contact_person: contactName.trim(),
        phone: contactPhone.trim(),
        email: contactEmail.trim(),
        shipping_address: shippingAddress.trim(),
        payment_terms: paymentTerms.trim(),
      }

      if (customerType === 'export') {
        body = { customer_type: 'export', ...base }
      } else {
        body = {
          customer_type: customerType,
          gst_number: gstNo.trim(),
          ...base,
        }
      }
    }

    setLoading(true)
    try {
      const res = await erpFetch<{ data: { id: string } }>('/api/customers', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      const id = res.data?.id
      if (id) {
        router.push(`/dashboard/sales/create?customerId=${encodeURIComponent(id)}`)
      } else {
        router.push('/dashboard/sales/create')
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create customer')
    } finally {
      setLoading(false)
    }
  }

  const showGst = customerType === 'oem' || customerType === 'oe' || customerType === 'distributor'
  const showBusinessForm =
    customerType === 'oem' ||
    customerType === 'oe' ||
    customerType === 'distributor' ||
    customerType === 'export'

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="sm" asChild className="gap-2">
          <Link href="/dashboard/sales/create">
            <ArrowLeft size={18} />
            Back
          </Link>
        </Button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Add customer</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Customer type</CardTitle>
            <CardDescription>Choose how this customer is classified.</CardDescription>
          </CardHeader>
          <CardContent>
            <Label htmlFor="customer_type" className="mb-2 block">
              Type *
            </Label>
            <select
              id="customer_type"
              value={customerType}
              onChange={(e) => handleTypeChange(e.target.value as CustomerType)}
              className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md bg-white"
            >
              <option value="">Select type…</option>
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        {customerType === 'ecommerce' && (
          <Card>
            <CardHeader>
              <CardTitle>Platform</CardTitle>
              <CardDescription>Select where this ecommerce customer sells.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label className="block mb-2">Platform *</Label>
              <div className="flex flex-col gap-2">
                {(
                  [
                    { value: 'amazon' as const, label: 'Amazon' },
                    { value: 'flipkart' as const, label: 'Flipkart' },
                    { value: 'direct' as const, label: 'Direct' },
                  ] as const
                ).map((p) => (
                  <label key={p.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="platform"
                      value={p.value}
                      checked={ecommercePlatform === p.value}
                      onChange={() => setEcommercePlatform(p.value)}
                    />
                    <span>{p.label}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {showBusinessForm && (
          <Card>
            <CardHeader>
              <CardTitle>Company details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="company">Company name *</Label>
                <Input
                  id="company"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="mt-1"
                  autoComplete="organization"
                />
              </div>

              {showGst && (
                <div>
                  <Label htmlFor="gst">GST number *</Label>
                  <Input
                    id="gst"
                    value={gstNo}
                    onChange={(e) => setGstNo(e.target.value)}
                    className="mt-1"
                    placeholder="15-character GSTIN"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="billing">Billing address *</Label>
                <Textarea
                  id="billing"
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="contact_name">Contact person name *</Label>
                <Input
                  id="contact_name"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="contact_phone">Contact person phone *</Label>
                <Input
                  id="contact_phone"
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="contact_email">Contact person email *</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="shipping">Shipping address *</Label>
                <Textarea
                  id="shipping"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="terms">Payment terms *</Label>
                <Input
                  id="terms"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="mt-1"
                  placeholder="e.g. Net 30, Advance 100%"
                />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard/sales/create">Cancel</Link>
          </Button>
          <Button type="submit" disabled={loading || !customerType}>
            {loading ? 'Saving…' : 'Submit'}
          </Button>
        </div>
      </form>
    </div>
  )
}
