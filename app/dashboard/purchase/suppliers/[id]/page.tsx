'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type SupplierDetails = {
  id: string
  supplier_code?: string | null
  name: string
  address?: string | null
  supplier_type?: 'domestic' | 'international' | null
  gst_number?: string | null
  gst_name?: string | null
  gst_address?: string | null
  pan?: string | null
  supplier_country?: string | null
  tax_identification_number?: string | null
  bank_name_on_account?: string | null
  bank_name?: string | null
  bank_branch?: string | null
  bank_account_number?: string | null
  ifsc_code?: string | null
  gst_certificate_signed_url?: string | null
  supplier_contacts?: Array<{
    id?: string
    name: string
    designation: string
    phone?: string | null
    email?: string | null
    is_primary?: boolean
  }> | null
  supplier_items?: Array<{
    item_id: string
    items?: { id: string; sku: string; name: string } | null
  }> | null
}

function DataRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value && value.trim() ? value : '-'}</p>
    </div>
  )
}

export default function SupplierDetailsPage() {
  const params = useParams<{ id: string }>()
  const supplierId = params?.id
  const [supplier, setSupplier] = useState<SupplierDetails | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supplierId) return
    void Promise.all([load(supplierId), loadMe()])
  }, [supplierId])

  const loadMe = async () => {
    try {
      const response = await erpFetch<{ user: { role: string } }>('/api/me')
      setIsAdmin(response.user.role === 'admin')
    } catch {
      setIsAdmin(false)
    }
  }

  const load = async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await erpFetch<{ data: SupplierDetails }>(`/api/suppliers/${id}`)
      setSupplier(response.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load supplier details')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading supplier details...</div>
  }

  if (error || !supplier) {
    return (
      <div className="p-8">
        <p className="text-sm text-red-600">{error ?? 'Supplier not found'}</p>
      </div>
    )
  }

  const contacts = supplier.supplier_contacts ?? []
  const items = supplier.supplier_items ?? []

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/purchase/suppliers">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft size={16} />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{supplier.name}</h1>
            <p className="text-sm text-muted-foreground">Supplier details</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{supplier.supplier_code ?? 'No Code'}</Badge>
          {isAdmin && (
            <Link href={`/dashboard/purchase/suppliers/${supplier.id}/edit`}>
              <Button variant="outline" size="sm">
                Edit
              </Button>
            </Link>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Basic Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <DataRow label="Name of Entity" value={supplier.name} />
          <DataRow label="Address" value={supplier.address} />
          <DataRow
            label="Supplier Type"
            value={supplier.supplier_type ? `${supplier.supplier_type[0].toUpperCase()}${supplier.supplier_type.slice(1)}` : '-'}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tax Details</CardTitle>
          <CardDescription>Domestic/International details and GST certificate</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <DataRow label="GST Number" value={supplier.gst_number} />
          <DataRow label="Name on GST" value={supplier.gst_name} />
          <DataRow label="GST Address" value={supplier.gst_address} />
          <DataRow label="PAN" value={supplier.pan} />
          <DataRow label="Supplier Country" value={supplier.supplier_country} />
          <DataRow label="Tax Identification Number" value={supplier.tax_identification_number} />
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">GST Certificate</p>
            {supplier.gst_certificate_signed_url ? (
              <a href={supplier.gst_certificate_signed_url} target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm" className="mt-1 gap-2">
                  <ExternalLink size={14} />
                  Preview Certificate
                </Button>
              </a>
            ) : (
              <p className="text-sm font-medium">-</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bank Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <DataRow label="Name on Account" value={supplier.bank_name_on_account} />
          <DataRow label="Bank Name" value={supplier.bank_name} />
          <DataRow label="Bank Branch" value={supplier.bank_branch} />
          <DataRow label="Account Number" value={supplier.bank_account_number} />
          <DataRow label="IFSC Code" value={supplier.ifsc_code} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Persons of Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No contacts found.</p>
          ) : (
            contacts.map((contact, index) => (
              <div key={contact.id ?? `${contact.name}-${index}`} className="rounded-md border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-medium">{contact.name}</p>
                  {contact.is_primary && <Badge>Primary</Badge>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <DataRow label="Designation" value={contact.designation} />
                  <DataRow label="Phone" value={contact.phone ?? null} />
                  <DataRow label="Email" value={contact.email ?? null} />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Supplier for Items</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No items linked.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {items.map((row) => (
                <Badge key={row.item_id} variant="secondary">
                  {row.items?.sku ?? row.item_id} - {row.items?.name ?? 'Unknown Item'}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
