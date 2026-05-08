'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

type SupplierType = 'domestic' | 'international'

type ItemRow = {
  id: string
  sku: string
  name: string
}

type Contact = {
  name: string
  designation: string
  phone: string
  email: string
}

type SupplierApiRow = {
  id: string
  name: string
  address?: string | null
  supplier_type?: SupplierType | null
  gst_number?: string | null
  gst_name?: string | null
  gst_address?: string | null
  gst_certificate_url?: string | null
  pan?: string | null
  supplier_country?: string | null
  tax_identification_number?: string | null
  bank_name_on_account?: string | null
  bank_name?: string | null
  bank_branch?: string | null
  bank_account_number?: string | null
  ifsc_code?: string | null
  supplier_contacts?: Array<{
    name: string
    designation: string
    phone?: string | null
    email?: string | null
  }> | null
  supplier_items?: Array<{
    item_id: string
    items?: { id: string; sku: string; name: string } | null
  }> | null
}

type SupplierPayload = {
  name: string
  address: string
  supplier_type: SupplierType
  gst_number?: string | null
  gst_name?: string | null
  gst_address?: string | null
  gst_certificate_url?: string | null
  pan?: string | null
  supplier_country?: string | null
  tax_identification_number?: string | null
  bank_name_on_account?: string | null
  bank_name?: string | null
  bank_branch?: string | null
  bank_account_number?: string | null
  ifsc_code?: string | null
  contacts: Array<{
    name: string
    designation: string
    phone?: string | null
    email?: string | null
  }>
  item_ids: string[]
}

const EMPTY_CONTACT: Contact = {
  name: '',
  designation: '',
  phone: '',
  email: '',
}

export function SupplierForm({
  mode,
  supplierId,
}: {
  mode: 'create' | 'edit'
  supplierId?: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(mode === 'edit')
  const [checkingRole, setCheckingRole] = useState(true)
  const [canManage, setCanManage] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [items, setItems] = useState<ItemRow[]>([])
  const [itemSearch, setItemSearch] = useState('')

  const [entityName, setEntityName] = useState('')
  const [address, setAddress] = useState('')
  const [supplierType, setSupplierType] = useState<SupplierType>('domestic')
  const [gstNumber, setGstNumber] = useState('')
  const [gstCertificateUrl, setGstCertificateUrl] = useState('')
  const [gstCertificateFile, setGstCertificateFile] = useState<File | null>(null)
  const [gstName, setGstName] = useState('')
  const [gstAddress, setGstAddress] = useState('')
  const [sameNameAsEntity, setSameNameAsEntity] = useState(true)
  const [sameAddressAsEntity, setSameAddressAsEntity] = useState(true)
  const [pan, setPan] = useState('')
  const [supplierCountry, setSupplierCountry] = useState('')
  const [taxIdNumber, setTaxIdNumber] = useState('')

  const [bankNameOnAccount, setBankNameOnAccount] = useState('')
  const [bankName, setBankName] = useState('')
  const [bankBranch, setBankBranch] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [ifscCode, setIfscCode] = useState('')

  const [contacts, setContacts] = useState<Contact[]>([{ ...EMPTY_CONTACT }])
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])

  useEffect(() => {
    if (sameNameAsEntity) {
      setGstName(entityName)
      setBankNameOnAccount(entityName)
    }
  }, [entityName, sameNameAsEntity])

  useEffect(() => {
    if (sameAddressAsEntity) {
      setGstAddress(address)
    }
  }, [address, sameAddressAsEntity])

  useEffect(() => {
    if (!sameNameAsEntity && supplierType === 'domestic') return
    setBankNameOnAccount(gstName || entityName)
  }, [gstName, entityName, sameNameAsEntity, supplierType])

  useEffect(() => {
    void loadMe()
    void loadItems()
    if (mode === 'edit' && supplierId) {
      void loadSupplier(supplierId)
    }
  }, [mode, supplierId])

  const loadMe = async () => {
    setCheckingRole(true)
    try {
      const res = await erpFetch<{ user: { role: string } }>('/api/me')
      setCanManage(res.user.role === 'admin')
    } catch {
      setCanManage(false)
    } finally {
      setCheckingRole(false)
    }
  }

  const loadItems = async () => {
    try {
      const res = await erpFetch<{ data: ItemRow[] }>('/api/items?limit=300')
      setItems(res.data ?? [])
    } catch {
      setItems([])
    }
  }

  const loadSupplier = async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await erpFetch<{ data: SupplierApiRow }>(`/api/suppliers/${id}`)
      const supplier = res.data
      setEntityName(supplier.name ?? '')
      setAddress(supplier.address ?? '')
      setSupplierType((supplier.supplier_type as SupplierType) ?? 'domestic')
      setGstNumber(supplier.gst_number ?? '')
      setGstCertificateUrl(supplier.gst_certificate_url ?? '')
      setGstName(supplier.gst_name ?? '')
      setGstAddress(supplier.gst_address ?? '')
      setPan(supplier.pan ?? '')
      setSupplierCountry(supplier.supplier_country ?? '')
      setTaxIdNumber(supplier.tax_identification_number ?? '')
      setBankNameOnAccount(supplier.bank_name_on_account ?? '')
      setBankName(supplier.bank_name ?? '')
      setBankBranch(supplier.bank_branch ?? '')
      setAccountNumber(supplier.bank_account_number ?? '')
      setIfscCode(supplier.ifsc_code ?? '')

      const loadedContacts = supplier.supplier_contacts?.map((contact) => ({
        name: contact.name ?? '',
        designation: contact.designation ?? '',
        phone: contact.phone ?? '',
        email: contact.email ?? '',
      }))
      setContacts(loadedContacts && loadedContacts.length > 0 ? loadedContacts : [{ ...EMPTY_CONTACT }])
      setSelectedItemIds((supplier.supplier_items ?? []).map((item) => item.item_id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load supplier')
    } finally {
      setLoading(false)
    }
  }

  const filteredItems = useMemo(() => {
    const term = itemSearch.trim().toLowerCase()
    if (!term) return items
    return items.filter(
      (item) => item.name.toLowerCase().includes(term) || item.sku.toLowerCase().includes(term),
    )
  }, [items, itemSearch])

  const selectedItems = useMemo(
    () => items.filter((item) => selectedItemIds.includes(item.id)),
    [items, selectedItemIds],
  )

  const upsertContact = (index: number, field: keyof Contact, value: string) => {
    setContacts((prev) =>
      prev.map((contact, i) => (i === index ? { ...contact, [field]: value } : contact)),
    )
  }

  const addContact = () => {
    setContacts((prev) => [...prev, { ...EMPTY_CONTACT }])
  }

  const removeContact = (index: number) => {
    setContacts((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
  }

  const toggleItem = (itemId: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId],
    )
  }

  const removeSelectedItem = (itemId: string) => {
    setSelectedItemIds((prev) => prev.filter((id) => id !== itemId))
  }

  const validate = (): string | null => {
    if (!entityName.trim()) return 'Name of Entity is required.'
    if (!address.trim()) return 'Address is required.'
    if (supplierType === 'domestic' && !gstNumber.trim()) return 'GST No. is required for domestic suppliers.'
    if (supplierType === 'international' && !supplierCountry.trim()) {
      return 'Supplier Country is required for international suppliers.'
    }
    if (
      contacts.length === 0 ||
      contacts.some((contact) => !contact.name.trim() || !contact.designation.trim())
    ) {
      return 'At least one contact with name and designation is required.'
    }
    return null
  }

  const buildPayload = (): SupplierPayload => {
    return {
      name: entityName.trim(),
      address: address.trim(),
      supplier_type: supplierType,
      gst_number: gstNumber.trim() || null,
      gst_name: gstName.trim() || null,
      gst_address: gstAddress.trim() || null,
      gst_certificate_url: gstCertificateUrl.trim() || null,
      pan: pan.trim() || null,
      supplier_country: supplierCountry.trim() || null,
      tax_identification_number: taxIdNumber.trim() || null,
      bank_name_on_account: bankNameOnAccount.trim() || null,
      bank_name: bankName.trim() || null,
      bank_branch: bankBranch.trim() || null,
      bank_account_number: accountNumber.trim() || null,
      ifsc_code: ifscCode.trim() || null,
      contacts: contacts.map((contact) => ({
        name: contact.name.trim(),
        designation: contact.designation.trim(),
        phone: contact.phone.trim() || null,
        email: contact.email.trim() || null,
      })),
      item_ids: selectedItemIds,
    }
  }

  const buildFormDataPayload = (payload: SupplierPayload): FormData => {
    const formData = new FormData()
    formData.append('name', payload.name)
    formData.append('address', payload.address)
    formData.append('supplier_type', payload.supplier_type)
    formData.append('gst_number', payload.gst_number ?? '')
    formData.append('gst_name', payload.gst_name ?? '')
    formData.append('gst_address', payload.gst_address ?? '')
    formData.append('gst_certificate_url', payload.gst_certificate_url ?? '')
    formData.append('pan', payload.pan ?? '')
    formData.append('supplier_country', payload.supplier_country ?? '')
    formData.append('tax_identification_number', payload.tax_identification_number ?? '')
    formData.append('bank_name_on_account', payload.bank_name_on_account ?? '')
    formData.append('bank_name', payload.bank_name ?? '')
    formData.append('bank_branch', payload.bank_branch ?? '')
    formData.append('bank_account_number', payload.bank_account_number ?? '')
    formData.append('ifsc_code', payload.ifsc_code ?? '')
    formData.append('contacts', JSON.stringify(payload.contacts))
    formData.append('item_ids', JSON.stringify(payload.item_ids))
    if (gstCertificateFile) {
      formData.append('gst_certificate', gstCertificateFile)
    }
    return formData
  }

  const submit = async () => {
    const validation = validate()
    if (validation) {
      setError(validation)
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const payload = buildPayload()
      const formData = buildFormDataPayload(payload)
      if (mode === 'create') {
        await erpFetch('/api/suppliers', { method: 'POST', body: formData })
      } else if (supplierId) {
        await erpFetch(`/api/suppliers/${supplierId}`, { method: 'PUT', body: formData })
      }
      router.push('/dashboard/purchase/suppliers')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save supplier')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || checkingRole) {
    return <div className="p-8 text-sm text-muted-foreground">Loading supplier details...</div>
  }

  if (!canManage) {
    return (
      <div className="p-8">
        <p className="text-sm text-red-600">Only admin can create or edit suppliers.</p>
      </div>
    )
  }

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
            <h1 className="text-3xl font-bold">{mode === 'create' ? 'Create Supplier' : 'Edit Supplier'}</h1>
            <p className="text-sm text-muted-foreground">
              {mode === 'create' ? '' : 'Update supplier details'}
            </p>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Basic Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="mb-1 text-sm font-medium">Name of Entity *</p>
              <Input value={entityName} onChange={(e) => setEntityName(e.target.value)} />
            </div>
            <div>
              <p className="mb-1 text-sm font-medium">Address *</p>
              <Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tax Details</CardTitle>
          <CardDescription>Choose domestic or international supplier details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={supplierType === 'domestic'}
                onCheckedChange={(checked) => {
                  if (checked) setSupplierType('domestic')
                }}
              />
              Domestic Supplier
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={supplierType === 'international'}
                onCheckedChange={(checked) => {
                  if (checked) setSupplierType('international')
                }}
              />
              International Supplier
            </label>
          </div>

          {supplierType === 'domestic' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="mb-1 text-sm font-medium">GST No. *</p>
                <Input value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} />
              </div>
              <div>
                <p className="mb-1 text-sm font-medium">GST Certificate Upload (optional)</p>
                <Input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={(e) => setGstCertificateFile(e.target.files?.[0] ?? null)}
                />
                {gstCertificateUrl && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Existing certificate on record. Uploading a new file will replace it.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={sameNameAsEntity}
                    onCheckedChange={(checked) => setSameNameAsEntity(Boolean(checked))}
                  />
                  Same as Name of Entity
                </label>
                <p className="mb-1 text-sm font-medium">Name on GST</p>
                <Input
                  value={gstName}
                  onChange={(e) => setGstName(e.target.value)}
                  disabled={sameNameAsEntity}
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={sameAddressAsEntity}
                    onCheckedChange={(checked) => setSameAddressAsEntity(Boolean(checked))}
                  />
                  Same as Address
                </label>
                <p className="mb-1 text-sm font-medium">GST Address</p>
                <Textarea
                  value={gstAddress}
                  onChange={(e) => setGstAddress(e.target.value)}
                  rows={3}
                  disabled={sameAddressAsEntity}
                />
              </div>
              <div>
                <p className="mb-1 text-sm font-medium">PAN (optional)</p>
                <Input value={pan} onChange={(e) => setPan(e.target.value)} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="mb-1 text-sm font-medium">Supplier Country *</p>
                <Input value={supplierCountry} onChange={(e) => setSupplierCountry(e.target.value)} />
              </div>
              <div>
                <p className="mb-1 text-sm font-medium">Tax Identification Number (optional)</p>
                <Input value={taxIdNumber} onChange={(e) => setTaxIdNumber(e.target.value)} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bank Details (optional)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="mb-1 text-sm font-medium">Name on Account</p>
            <Input
              value={bankNameOnAccount}
              onChange={(e) => setBankNameOnAccount(e.target.value)}
              disabled={supplierType === 'domestic'}
            />
          </div>
          <div>
            <p className="mb-1 text-sm font-medium">Bank Name</p>
            <Input value={bankName} onChange={(e) => setBankName(e.target.value)} />
          </div>
          <div>
            <p className="mb-1 text-sm font-medium">Bank Branch</p>
            <Input value={bankBranch} onChange={(e) => setBankBranch(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="mb-1 text-sm font-medium">Account Number</p>
              <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
            </div>
            <div>
              <p className="mb-1 text-sm font-medium">IFSC Code</p>
              <Input value={ifscCode} onChange={(e) => setIfscCode(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Person Of Contact</CardTitle>
          <CardDescription>At least one contact is required</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {contacts.map((contact, index) => (
            <div key={index} className="rounded-md border p-3 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="mb-1 text-sm font-medium">Name *</p>
                  <Input
                    value={contact.name}
                    onChange={(e) => upsertContact(index, 'name', e.target.value)}
                  />
                </div>
                <div>
                  <p className="mb-1 text-sm font-medium">Designation *</p>
                  <Input
                    value={contact.designation}
                    onChange={(e) => upsertContact(index, 'designation', e.target.value)}
                  />
                </div>
                <div>
                  <p className="mb-1 text-sm font-medium">Phone (optional)</p>
                  <Input
                    value={contact.phone}
                    onChange={(e) => upsertContact(index, 'phone', e.target.value)}
                  />
                </div>
                <div>
                  <p className="mb-1 text-sm font-medium">Email (optional)</p>
                  <Input
                    value={contact.email}
                    onChange={(e) => upsertContact(index, 'email', e.target.value)}
                  />
                </div>
              </div>
              {contacts.length > 1 && (
                <Button type="button" variant="outline" size="sm" onClick={() => removeContact(index)}>
                  <Trash2 size={14} />
                  Remove Contact
                </Button>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addContact} className="gap-2">
            <Plus size={16} />
            Add Contact
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Supplier for Items (optional)</CardTitle>
          <CardDescription>Select multiple items</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Search items by SKU or name..."
            value={itemSearch}
            onChange={(e) => setItemSearch(e.target.value)}
          />
          <div className="max-h-56 overflow-auto rounded-md border p-2 space-y-2">
            {filteredItems.map((item) => (
              <label key={item.id} className="flex items-center gap-2 text-sm px-2 py-1 rounded hover:bg-muted/40">
                <Checkbox
                  checked={selectedItemIds.includes(item.id)}
                  onCheckedChange={() => toggleItem(item.id)}
                />
                <span className="font-mono text-xs text-muted-foreground">{item.sku}</span>
                <span>{item.name}</span>
              </label>
            ))}
            {filteredItems.length === 0 && (
              <p className="text-sm text-muted-foreground px-2 py-1">No matching items found.</p>
            )}
          </div>

          {selectedItems.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedItems.map((item) => (
                <Badge key={item.id} variant="secondary" className="gap-2">
                  {item.sku} - {item.name}
                  <button
                    type="button"
                    className="text-xs"
                    onClick={() => removeSelectedItem(item.id)}
                    aria-label={`Remove ${item.name}`}
                  >
                    x
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={submitting}>{mode === 'create' ? 'Create Supplier' : 'Save Supplier'}</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {mode === 'create' ? 'Create this supplier?' : 'Save supplier updates?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                Please confirm to proceed. This will save supplier master details and related contacts/items.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
              <AlertDialogAction disabled={submitting} onClick={() => void submit()}>
                {submitting ? 'Saving...' : 'Confirm'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
