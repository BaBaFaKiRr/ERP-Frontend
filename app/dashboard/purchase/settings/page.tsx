'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import {
  ProfileDetailDialog,
  type ProfileDetailContent,
} from '@/components/settings/profile-detail-dialog'
import { SavedProfileRow } from '@/components/settings/saved-profile-row'
import { SettingsPageShell } from '@/components/settings/settings-page-shell'
import {
  SettingsSectionGrid,
  SettingsSplitLayout,
} from '@/components/settings/settings-split-layout'
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
  const [viewingProfile, setViewingProfile] = useState<ProfileDetailContent | null>(null)

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

  const viewTermsProfile = (row: PurchaseTermsProfile) => {
    setViewingProfile({
      title: row.alias,
      isDefault: row.is_default,
      textContent: {
        label: 'Terms & Conditions',
        value: row.terms_text,
      },
    })
  }

  const viewAddressProfile = (row: PurchaseAddressProfile, label: string) => {
    setViewingProfile({
      title: row.alias,
      isDefault: row.is_default,
      textContent: {
        label,
        value: row.address_text,
      },
    })
  }

  return (
    <SettingsPageShell
      title="Purchase Settings"
      description="Manage reusable terms and address profiles for purchase orders."
      backLink={{ href: '/dashboard/settings', label: 'Back to Settings' }}
      status={
        <>
          {loading ? <p className="text-sm text-muted-foreground">Loading profiles...</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </>
      }
    >
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Terms & Conditions</h2>
          <p className="text-sm text-muted-foreground">Profiles used on purchase order documents.</p>
        </div>
        <SettingsSplitLayout
          editor={
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">
                      {editingId ? 'Edit terms profile' : 'Create terms profile'}
                    </CardTitle>
                  </div>
                  <Button variant="outline" size="sm" onClick={resetForm}>
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
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => void save()} disabled={saving}>
                    {saving ? 'Saving...' : editingId ? 'Update Profile' : 'Create Profile'}
                  </Button>
                  <Button variant="outline" onClick={resetForm}>
                    Clear
                  </Button>
                </div>
              </CardContent>
            </Card>
          }
          list={
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Saved Terms Profiles</CardTitle>
                <CardDescription>
                  {rows.length === 0
                    ? 'No terms profiles created yet.'
                    : `${rows.length} profile${rows.length === 1 ? '' : 's'}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="max-h-[min(70vh,640px)] space-y-2 overflow-y-auto">
                {rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Create your first terms profile using the form.</p>
                ) : null}
                {rows.map((row) => (
                  <SavedProfileRow
                    key={row.id}
                    alias={row.alias}
                    isDefault={row.is_default}
                    onView={() => viewTermsProfile(row)}
                    onEdit={() => startEdit(row)}
                    onDelete={() => void remove(row.id)}
                    onSetDefault={() => void setDefault(row.id)}
                  />
                ))}
              </CardContent>
            </Card>
          }
        />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Address Profiles</h2>
          <p className="text-sm text-muted-foreground">Delivery and billing addresses for purchase orders.</p>
        </div>
        <SettingsSectionGrid columns={2}>
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
            onView={(row) => viewAddressProfile(row, 'Delivery Address')}
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
            onView={(row) => viewAddressProfile(row, 'Billing Address')}
            onSetDefault={(id) => void setDefaultAddress(id)}
            onDelete={(id) => void removeAddress(id)}
          />
        </SettingsSectionGrid>
      </section>

      <ProfileDetailDialog
        content={viewingProfile}
        open={viewingProfile !== null}
        onOpenChange={(open) => {
          if (!open) setViewingProfile(null)
        }}
      />
    </SettingsPageShell>
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
  onView: (row: PurchaseAddressProfile) => void
  onSetDefault: (id: string) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="flex h-full min-w-0 flex-col gap-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">{props.title}</CardTitle>
              <CardDescription>Create and manage reusable address profiles</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={props.onClear}>
              <Plus className="mr-2 size-4" />
              New
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Alias" value={props.alias} onChange={(e) => props.onAliasChange(e.target.value)} />
          <Textarea
            rows={4}
            placeholder="Enter address..."
            value={props.addressText}
            onChange={(e) => props.onAddressChange(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={props.onSave} disabled={props.saving}>
              {props.saving ? 'Saving...' : props.editingId ? 'Update Address Profile' : 'Create Address Profile'}
            </Button>
            <Button variant="outline" onClick={props.onClear}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="flex min-h-0 flex-1 flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Saved Profiles</CardTitle>
          <CardDescription>
            {props.rows.length === 0
              ? 'No address profiles created yet.'
              : `${props.rows.length} profile${props.rows.length === 1 ? '' : 's'}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="max-h-[min(50vh,480px)] space-y-2 overflow-y-auto">
          {props.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Create your first address profile using the form.</p>
          ) : null}
          {props.rows.map((row) => (
            <SavedProfileRow
              key={row.id}
              alias={row.alias}
              isDefault={row.is_default}
              onView={() => props.onView(row)}
              onEdit={() => props.onEdit(row)}
              onDelete={() => props.onDelete(row.id)}
              onSetDefault={() => props.onSetDefault(row.id)}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
