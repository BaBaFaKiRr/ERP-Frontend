'use client'

import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

type PurchaseTermsProfile = {
  id: string
  alias: string
  terms_text: string
  is_default: boolean
}

type PurchaseAddressProfile = {
  id: string
  profile_type: 'delivery' | 'billing'
  alias: string
  address_text: string
  is_default: boolean
}

export default function PurchaseSettingsPage() {
  const [rows, setRows] = useState<PurchaseTermsProfile[]>([])
  const [deliveryRows, setDeliveryRows] = useState<PurchaseAddressProfile[]>([])
  const [billingRows, setBillingRows] = useState<PurchaseAddressProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [alias, setAlias] = useState('')
  const [termsText, setTermsText] = useState('')
  const [deliveryEditingId, setDeliveryEditingId] = useState<string | null>(null)
  const [deliveryAlias, setDeliveryAlias] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [billingEditingId, setBillingEditingId] = useState<string | null>(null)
  const [billingAlias, setBillingAlias] = useState('')
  const [billingAddress, setBillingAddress] = useState('')

  const hasDefault = useMemo(() => rows.some((row) => row.is_default), [rows])
  const hasDeliveryDefault = useMemo(() => deliveryRows.some((row) => row.is_default), [deliveryRows])
  const hasBillingDefault = useMemo(() => billingRows.some((row) => row.is_default), [billingRows])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [termsRes, deliveryRes, billingRes] = await Promise.all([
        erpFetch<{ data: PurchaseTermsProfile[] }>('/api/purchase-settings/terms'),
        erpFetch<{ data: PurchaseAddressProfile[] }>('/api/purchase-settings/addresses?type=delivery'),
        erpFetch<{ data: PurchaseAddressProfile[] }>('/api/purchase-settings/addresses?type=billing'),
      ])
      setRows(termsRes.data ?? [])
      setDeliveryRows(deliveryRes.data ?? [])
      setBillingRows(billingRes.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load purchase settings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const resetForm = () => {
    setEditingId(null)
    setAlias('')
    setTermsText('')
  }

  const resetDeliveryForm = () => {
    setDeliveryEditingId(null)
    setDeliveryAlias('')
    setDeliveryAddress('')
  }

  const resetBillingForm = () => {
    setBillingEditingId(null)
    setBillingAlias('')
    setBillingAddress('')
  }

  const startEdit = (row: PurchaseTermsProfile) => {
    setEditingId(row.id)
    setAlias(row.alias)
    setTermsText(row.terms_text)
  }

  const save = async () => {
    if (!alias.trim() || !termsText.trim()) {
      setError('Alias and terms text are required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (editingId) {
        await erpFetch(`/api/purchase-settings/terms/${editingId}`, {
          method: 'PUT',
          body: { alias: alias.trim(), terms_text: termsText.trim() },
        })
      } else {
        await erpFetch('/api/purchase-settings/terms', {
          method: 'POST',
          body: {
            alias: alias.trim(),
            terms_text: termsText.trim(),
            is_default: !hasDefault,
          },
        })
      }
      await load()
      resetForm()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const saveAddress = async (type: 'delivery' | 'billing') => {
    const isDelivery = type === 'delivery'
    const editId = isDelivery ? deliveryEditingId : billingEditingId
    const localAlias = (isDelivery ? deliveryAlias : billingAlias).trim()
    const localAddress = (isDelivery ? deliveryAddress : billingAddress).trim()
    const defaultMissing = isDelivery ? !hasDeliveryDefault : !hasBillingDefault

    if (!localAlias || !localAddress) {
      setError('Address alias and text are required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (editId) {
        await erpFetch(`/api/purchase-settings/addresses/${editId}`, {
          method: 'PUT',
          body: { alias: localAlias, address_text: localAddress },
        })
      } else {
        await erpFetch('/api/purchase-settings/addresses', {
          method: 'POST',
          body: {
            profile_type: type,
            alias: localAlias,
            address_text: localAddress,
            is_default: defaultMissing,
          },
        })
      }
      await load()
      if (isDelivery) resetDeliveryForm()
      else resetBillingForm()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save address profile')
    } finally {
      setSaving(false)
    }
  }

  const setDefault = async (id: string) => {
    try {
      await erpFetch(`/api/purchase-settings/terms/${id}/default`, {
        method: 'POST',
        body: { is_default: true },
      })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to set default profile')
    }
  }

  const remove = async (id: string) => {
    try {
      await erpFetch(`/api/purchase-settings/terms/${id}`, { method: 'DELETE' })
      await load()
      if (editingId === id) resetForm()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete profile')
    }
  }

  const setDefaultAddress = async (id: string) => {
    try {
      await erpFetch(`/api/purchase-settings/addresses/${id}/default`, {
        method: 'POST',
        body: { is_default: true },
      })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to set default address profile')
    }
  }

  const removeAddress = async (id: string) => {
    try {
      await erpFetch(`/api/purchase-settings/addresses/${id}`, { method: 'DELETE' })
      await load()
      if (deliveryEditingId === id) resetDeliveryForm()
      if (billingEditingId === id) resetBillingForm()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete address profile')
    }
  }

  return (
    <div className="p-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Purchase Settings</CardTitle>
          <CardDescription>Create Terms & Conditions profiles for Purchase Orders</CardDescription>
        </CardHeader>
      </Card>

      {loading && <p className="text-sm text-muted-foreground">Loading profiles...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{editingId ? 'Edit terms profile' : 'Create terms profile'}</CardTitle>
            </div>
            <Button variant="outline" onClick={resetForm}>
              <Plus className="mr-2 size-4" />
              New
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Alias (e.g. Standard Raw Material PO Terms)"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
          />
          <Textarea
            rows={8}
            placeholder="Enter Terms and Conditions text..."
            value={termsText}
            onChange={(e) => setTermsText(e.target.value)}
          />
          <div className="flex gap-2">
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Update Profile' : 'Create Profile'}
            </Button>
            <Button variant="outline" onClick={resetForm}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Saved Terms Profiles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {rows.length === 0 ? <p className="text-sm text-muted-foreground">No terms profiles created yet.</p> : null}
          {rows.map((row) => (
            <div key={row.id} className="rounded-md border p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{row.alias}</p>
                  <p className="text-xs text-muted-foreground">{row.is_default ? 'Default profile' : 'Not default'}</p>
                </div>
                <div className="flex items-center gap-2">
                  {!row.is_default ? (
                    <Button variant="outline" size="sm" onClick={() => void setDefault(row.id)}>
                      <Star className="mr-1 size-4" />
                      Set Default
                    </Button>
                  ) : (
                    <Button variant="secondary" size="sm" disabled>
                      <Star className="mr-1 size-4" />
                      Default
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => startEdit(row)}>
                    <Pencil className="mr-1 size-4" />
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => void remove(row.id)}>
                    <Trash2 className="mr-1 size-4" />
                    Delete
                  </Button>
                </div>
              </div>
              <div className="whitespace-pre-wrap rounded border bg-muted/20 p-2 text-sm">{row.terms_text}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <AddressSettingsSection
        title="Delivery Address Profiles"
        rows={deliveryRows}
        alias={deliveryAlias}
        addressText={deliveryAddress}
        editingId={deliveryEditingId}
        saving={saving}
        onAliasChange={setDeliveryAlias}
        onAddressChange={setDeliveryAddress}
        onSave={() => void saveAddress('delivery')}
        onClear={resetDeliveryForm}
        onEdit={(row) => {
          setDeliveryEditingId(row.id)
          setDeliveryAlias(row.alias)
          setDeliveryAddress(row.address_text)
        }}
        onSetDefault={(id) => void setDefaultAddress(id)}
        onDelete={(id) => void removeAddress(id)}
      />

      <AddressSettingsSection
        title="Billing Address Profiles"
        rows={billingRows}
        alias={billingAlias}
        addressText={billingAddress}
        editingId={billingEditingId}
        saving={saving}
        onAliasChange={setBillingAlias}
        onAddressChange={setBillingAddress}
        onSave={() => void saveAddress('billing')}
        onClear={resetBillingForm}
        onEdit={(row) => {
          setBillingEditingId(row.id)
          setBillingAlias(row.alias)
          setBillingAddress(row.address_text)
        }}
        onSetDefault={(id) => void setDefaultAddress(id)}
        onDelete={(id) => void removeAddress(id)}
      />
    </div>
  )
}

function AddressSettingsSection(props: {
  title: string
  rows: PurchaseAddressProfile[]
  alias: string
  addressText: string
  editingId: string | null
  saving: boolean
  onAliasChange: (v: string) => void
  onAddressChange: (v: string) => void
  onSave: () => void
  onClear: () => void
  onEdit: (row: PurchaseAddressProfile) => void
  onSetDefault: (id: string) => void
  onDelete: (id: string) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{props.title}</CardTitle>
        <CardDescription>Create and manage reusable address profiles</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input placeholder="Alias" value={props.alias} onChange={(e) => props.onAliasChange(e.target.value)} />
        <Textarea
          rows={4}
          placeholder="Enter address..."
          value={props.addressText}
          onChange={(e) => props.onAddressChange(e.target.value)}
        />
        <div className="flex gap-2">
          <Button onClick={props.onSave} disabled={props.saving}>
            {props.saving ? 'Saving...' : props.editingId ? 'Update Address Profile' : 'Create Address Profile'}
          </Button>
          <Button variant="outline" onClick={props.onClear}>
            <Plus className="mr-2 size-4" />
            New
          </Button>
        </div>

        {props.rows.length === 0 ? <p className="text-sm text-muted-foreground">No address profiles created yet.</p> : null}
        {props.rows.map((row) => (
          <div key={row.id} className="rounded-md border p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div>
                <p className="font-medium">{row.alias}</p>
                <p className="text-xs text-muted-foreground">{row.is_default ? 'Default profile' : 'Not default'}</p>
              </div>
              <div className="flex items-center gap-2">
                {!row.is_default ? (
                  <Button variant="outline" size="sm" onClick={() => props.onSetDefault(row.id)}>
                    <Star className="mr-1 size-4" />
                    Set Default
                  </Button>
                ) : (
                  <Button variant="secondary" size="sm" disabled>
                    <Star className="mr-1 size-4" />
                    Default
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => props.onEdit(row)}>
                  <Pencil className="mr-1 size-4" />
                  Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={() => props.onDelete(row.id)}>
                  <Trash2 className="mr-1 size-4" />
                  Delete
                </Button>
              </div>
            </div>
            <div className="whitespace-pre-wrap rounded border bg-muted/20 p-2 text-sm">{row.address_text}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
