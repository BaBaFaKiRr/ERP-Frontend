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

type CustomerType = 'oem' | 'oe' | 'distributor' | 'export' | 'ecommerce' | 'retail' | ''

const TYPE_OPTIONS: { value: CustomerType; label: string }[] = [
  { value: 'oem', label: 'OEM' },
  { value: 'oe', label: 'OE' },
  { value: 'distributor', label: 'Distributor' },
  { value: 'export', label: 'Export' },
  { value: 'ecommerce', label: 'EComm' },
  { value: 'retail', label: 'Retail' },
]

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

    if (!companyName.trim()) {
      alert('Company name is required')
      return
    }
    if (!billingAddress.trim() || !shippingAddress.trim()) {
      alert('Billing and shipping addresses are required')
      return
    }
    if (customerType === 'ecommerce' && !ecommercePlatform) {
      alert('Select an e-commerce platform')
      return
    }
    if (customerType === 'distributor' && !gstNo.trim()) {
      alert('GSTIN is required for Distributor customers')
      return
    }

    const body: Record<string, unknown> = {
      customer_type: customerType,
      name: companyName.trim(),
      billing_address: billingAddress.trim(),
      shipping_address: shippingAddress.trim(),
      gst_number: gstNo.trim() || null,
      ecommerce_platform: customerType === 'ecommerce' ? ecommercePlatform : null,
      contact_person: contactName.trim() || null,
      phone: contactPhone.trim() || null,
      email: contactEmail.trim() || null,
      payment_terms: paymentTerms.trim() || null,
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

  const showGst = customerType === 'distributor'
  const showPlatform = customerType === 'ecommerce'
  const showBusinessForm = customerType !== ''

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="sm" asChild className="gap-2">
          <Link href="/dashboard/sales/customers">
            <ArrowLeft size={18} />
            Back
          </Link>
        </Button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create customer</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Customer type *</CardTitle>
            <CardDescription>Choose how this customer is classified.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldLabel htmlFor="customer_type" required>
              Type
            </FieldLabel>
            <select
              id="customer_type"
              value={customerType}
              onChange={(e) => handleTypeChange(e.target.value as CustomerType)}
              required
              className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md bg-white dark:border-slate-600 dark:bg-slate-900"
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

        {showPlatform && (
          <Card>
            <CardHeader>
              <CardTitle>E-commerce platform *</CardTitle>
              <CardDescription>Required for EComm customers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <FieldLabel required>Platform</FieldLabel>
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
              <CardTitle>Customer details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <FieldLabel htmlFor="company" required>
                  Name
                </FieldLabel>
                <Input
                  id="company"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="mt-1"
                  autoComplete="organization"
                  required
                />
              </div>

              {showGst && (
                <div>
                  <FieldLabel htmlFor="gst" required>
                    GSTIN
                  </FieldLabel>
                  <Input
                    id="gst"
                    value={gstNo}
                    onChange={(e) => setGstNo(e.target.value)}
                    className="mt-1"
                    placeholder="15-character GSTIN"
                    required
                  />
                </div>
              )}

              {!showGst && customerType && customerType !== 'ecommerce' && (
                <div>
                  <FieldLabel htmlFor="gst-opt">GSTIN</FieldLabel>
                  <Input
                    id="gst-opt"
                    value={gstNo}
                    onChange={(e) => setGstNo(e.target.value)}
                    className="mt-1"
                    placeholder="Optional"
                  />
                </div>
              )}

              <div>
                <FieldLabel htmlFor="billing" required>
                  Billing address
                </FieldLabel>
                <Textarea
                  id="billing"
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  className="mt-1"
                  rows={3}
                  required
                />
              </div>

              <div>
                <FieldLabel htmlFor="shipping" required>
                  Shipping address
                </FieldLabel>
                <Textarea
                  id="shipping"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  className="mt-1"
                  rows={3}
                  required
                />
              </div>

              <div>
                <FieldLabel htmlFor="contact_name">Contact person</FieldLabel>
                <Input
                  id="contact_name"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <FieldLabel htmlFor="contact_phone">Phone</FieldLabel>
                <Input
                  id="contact_phone"
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <FieldLabel htmlFor="contact_email">Email</FieldLabel>
                <Input
                  id="contact_email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <FieldLabel htmlFor="terms">Payment terms</FieldLabel>
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
            <Link href="/dashboard/sales/customers">Cancel</Link>
          </Button>
          <Button type="submit" disabled={loading || !customerType}>
            {loading ? 'Saving…' : 'Submit'}
          </Button>
        </div>
      </form>
    </div>
  )
}