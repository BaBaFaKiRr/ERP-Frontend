'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import {
  ProfileDetailDialog,
  type ProfileDetailContent,
} from '@/components/settings/profile-detail-dialog'
import { SavedProfileRow } from '@/components/settings/saved-profile-row'
import { SettingsSplitLayout } from '@/components/settings/settings-split-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export type InvoiceSettingType = 'terms' | 'bank' | 'company'

export type InvoiceSettingProfile = {
  id: string
  setting_type: InvoiceSettingType
  alias: string
  is_default: boolean
  data: Record<string, unknown>
}

type BankData = {
  account_name: string
  bank_branch: string
  account_number: string
  ifsc_code: string
}

type CompanyData = {
  name: string
  address: string
  gstin: string
  pan: string
  cin: string
  tel?: string | null
  email?: string | null
}

const EMPTY_BANK: BankData = {
  account_name: '',
  bank_branch: '',
  account_number: '',
  ifsc_code: '',
}

const EMPTY_COMPANY: CompanyData = {
  name: '',
  address: '',
  gstin: '',
  pan: '',
  cin: '',
  tel: '',
  email: '',
}

type InvoiceProfilesSectionProps = {
  onProfilesLoaded?: (profiles: InvoiceSettingProfile[]) => void
  listTitle?: string
}

export function InvoiceProfilesSection({
  onProfilesLoaded,
  listTitle = 'Saved Objects',
}: InvoiceProfilesSectionProps) {
  const [activeTab, setActiveTab] = useState<InvoiceSettingType>('terms')
  const [rows, setRows] = useState<InvoiceSettingProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [alias, setAlias] = useState('')
  const [termsText, setTermsText] = useState('')
  const [bankData, setBankData] = useState<BankData>(EMPTY_BANK)
  const [companyData, setCompanyData] = useState<CompanyData>(EMPTY_COMPANY)
  const termsRef = useRef<HTMLTextAreaElement | null>(null)
  const [viewingProfile, setViewingProfile] = useState<ProfileDetailContent | null>(null)

  async function loadSettings() {
    setLoading(true)
    setError(null)
    try {
      const res = await erpFetch<{ data: InvoiceSettingProfile[] }>('/api/invoice-settings')
      const data = res.data ?? []
      setRows(data)
      onProfilesLoaded?.(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadSettings()
  }, [])

  const activeRows = useMemo(
    () => rows.filter((row) => row.setting_type === activeTab),
    [rows, activeTab],
  )

  const resetForm = () => {
    setEditingId(null)
    setAlias('')
    setTermsText('')
    setBankData(EMPTY_BANK)
    setCompanyData(EMPTY_COMPANY)
  }

  const startCreate = (type: InvoiceSettingType) => {
    setActiveTab(type)
    resetForm()
  }

  const startEdit = (row: InvoiceSettingProfile) => {
    setEditingId(row.id)
    setActiveTab(row.setting_type)
    setAlias(row.alias)
    if (row.setting_type === 'terms') {
      setTermsText(String(row.data.text ?? ''))
    }
    if (row.setting_type === 'bank') {
      setBankData({
        account_name: String(row.data.account_name ?? ''),
        bank_branch: String(row.data.bank_branch ?? ''),
        account_number: String(row.data.account_number ?? ''),
        ifsc_code: String(row.data.ifsc_code ?? ''),
      })
    }
    if (row.setting_type === 'company') {
      setCompanyData({
        name: String(row.data.name ?? ''),
        address: String(row.data.address ?? ''),
        gstin: String(row.data.gstin ?? ''),
        pan: String(row.data.pan ?? ''),
        cin: String(row.data.cin ?? ''),
        tel: String(row.data.tel ?? ''),
        email: String(row.data.email ?? ''),
      })
    }
  }

  const currentPayload = () => {
    if (activeTab === 'terms') return { text: termsText }
    if (activeTab === 'bank') return bankData
    return companyData
  }

  const saveObject = async () => {
    if (!alias.trim()) {
      alert('Alias is required')
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        await erpFetch(`/api/invoice-settings/${editingId}`, {
          method: 'PUT',
          body: { alias: alias.trim(), data: currentPayload() },
        })
      } else {
        await erpFetch('/api/invoice-settings', {
          method: 'POST',
          body: {
            setting_type: activeTab,
            alias: alias.trim(),
            is_default: activeRows.length === 0,
            data: currentPayload(),
          },
        })
      }
      await loadSettings()
      resetForm()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save settings object')
    } finally {
      setSaving(false)
    }
  }

  const deleteObject = async (id: string) => {
    const yes = confirm('Delete this settings object?')
    if (!yes) return
    try {
      await erpFetch(`/api/invoice-settings/${id}`, { method: 'DELETE' })
      await loadSettings()
      if (editingId === id) resetForm()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete settings object')
    }
  }

  const setDefault = async (id: string) => {
    try {
      await erpFetch(`/api/invoice-settings/${id}/default`, {
        method: 'POST',
        body: { is_default: true },
      })
      await loadSettings()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to set default')
    }
  }

  const viewObject = (row: InvoiceSettingProfile) => {
    if (row.setting_type === 'terms') {
      setViewingProfile({
        title: row.alias,
        isDefault: row.is_default,
        textContent: {
          label: 'Terms & Conditions',
          value: String(row.data.text ?? ''),
          renderAsHtml: true,
        },
      })
      return
    }
    if (row.setting_type === 'bank') {
      setViewingProfile({
        title: row.alias,
        isDefault: row.is_default,
        fields: [
          { label: 'Name on Account', value: String(row.data.account_name ?? '') },
          { label: 'Bank and Branch', value: String(row.data.bank_branch ?? '') },
          { label: 'Account Number', value: String(row.data.account_number ?? '') },
          { label: 'IFSC Code', value: String(row.data.ifsc_code ?? '') },
        ],
      })
      return
    }
    setViewingProfile({
      title: row.alias,
      isDefault: row.is_default,
      fields: [
        { label: 'Company Name', value: String(row.data.name ?? '') },
        { label: 'Address', value: String(row.data.address ?? '') },
        { label: 'GSTIN', value: String(row.data.gstin ?? '') },
        { label: 'PAN', value: String(row.data.pan ?? '') },
        { label: 'CIN', value: String(row.data.cin ?? '') },
        { label: 'Tel', value: String(row.data.tel ?? '') },
        { label: 'Email', value: String(row.data.email ?? '') },
      ],
    })
  }

  const applyTermsFormat = (prefix: string, suffix = prefix) => {
    const node = termsRef.current
    if (!node) return
    const start = node.selectionStart ?? termsText.length
    const end = node.selectionEnd ?? termsText.length
    const selected = termsText.slice(start, end)
    const replacement = `${prefix}${selected}${suffix}`
    const next = `${termsText.slice(0, start)}${replacement}${termsText.slice(end)}`
    setTermsText(next)
    requestAnimationFrame(() => {
      node.focus()
      node.selectionStart = start + prefix.length
      node.selectionEnd = start + prefix.length + selected.length
    })
  }

  return (
    <div className="space-y-4">
      {loading ? <p className="text-sm text-muted-foreground">Loading invoice profiles...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as InvoiceSettingType)}
        orientation="vertical"
        className="flex flex-col gap-6 lg:flex-row lg:items-start"
      >
        <TabsList className="h-auto w-full shrink-0 flex-col items-stretch lg:w-56 xl:w-64">
          <TabsTrigger value="terms" className="justify-start">
            Terms & Conditions
          </TabsTrigger>
          <TabsTrigger value="bank" className="justify-start">
            Bank Details
          </TabsTrigger>
          <TabsTrigger value="company" className="justify-start">
            Company Details
          </TabsTrigger>
        </TabsList>

        <div className="min-w-0 flex-1">
          <TabsContent value="terms" className="mt-0">
            <SettingsSplitLayout
              editor={
                <ProfileEditor
                  alias={alias}
                  setAlias={setAlias}
                  editingId={editingId}
                  saving={saving}
                  onCancel={resetForm}
                  onSave={() => void saveObject()}
                  onNew={() => startCreate('terms')}
                >
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Text formatting tools</p>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => applyTermsFormat('<b>', '</b>')}>Bold</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => applyTermsFormat('<i>', '</i>')}>Italic</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => applyTermsFormat('<u>', '</u>')}>Underline</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => applyTermsFormat('<br/>', '')}>Line Break</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => applyTermsFormat('<li>', '</li>')}>List Item</Button>
                    </div>
                    <textarea
                      ref={termsRef}
                      rows={8}
                      value={termsText}
                      onChange={(e) => setTermsText(e.target.value)}
                      placeholder="Enter terms text (HTML tags supported for formatting)."
                      className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
                    />
                  </div>
                </ProfileEditor>
              }
              list={
                <ProfileList
                  title={listTitle}
                  rows={activeRows}
                  onView={viewObject}
                  onEdit={startEdit}
                  onDelete={deleteObject}
                  onSetDefault={setDefault}
                />
              }
            />
          </TabsContent>

          <TabsContent value="bank" className="mt-0">
            <SettingsSplitLayout
              editor={
                <ProfileEditor
                  alias={alias}
                  setAlias={setAlias}
                  editingId={editingId}
                  saving={saving}
                  onCancel={resetForm}
                  onSave={() => void saveObject()}
                  onNew={() => startCreate('bank')}
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input placeholder="Name on Account" value={bankData.account_name} onChange={(e) => setBankData((p) => ({ ...p, account_name: e.target.value }))} />
                    <Input placeholder="Bank and Branch" value={bankData.bank_branch} onChange={(e) => setBankData((p) => ({ ...p, bank_branch: e.target.value }))} />
                    <Input placeholder="Account Number" value={bankData.account_number} onChange={(e) => setBankData((p) => ({ ...p, account_number: e.target.value }))} />
                    <Input placeholder="IFSC Code" value={bankData.ifsc_code} onChange={(e) => setBankData((p) => ({ ...p, ifsc_code: e.target.value }))} />
                  </div>
                </ProfileEditor>
              }
              list={
                <ProfileList
                  title={listTitle}
                  rows={activeRows}
                  onView={viewObject}
                  onEdit={startEdit}
                  onDelete={deleteObject}
                  onSetDefault={setDefault}
                />
              }
            />
          </TabsContent>

          <TabsContent value="company" className="mt-0">
            <SettingsSplitLayout
              editor={
                <ProfileEditor
                  alias={alias}
                  setAlias={setAlias}
                  editingId={editingId}
                  saving={saving}
                  onCancel={resetForm}
                  onSave={() => void saveObject()}
                  onNew={() => startCreate('company')}
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input placeholder="Company Name" value={companyData.name} onChange={(e) => setCompanyData((p) => ({ ...p, name: e.target.value }))} className="sm:col-span-2" />
                    <Textarea rows={3} placeholder="Address" value={companyData.address} onChange={(e) => setCompanyData((p) => ({ ...p, address: e.target.value }))} className="sm:col-span-2" />
                    <Input placeholder="GSTIN" value={companyData.gstin} onChange={(e) => setCompanyData((p) => ({ ...p, gstin: e.target.value }))} />
                    <Input placeholder="PAN" value={companyData.pan} onChange={(e) => setCompanyData((p) => ({ ...p, pan: e.target.value }))} />
                    <Input placeholder="CIN" value={companyData.cin} onChange={(e) => setCompanyData((p) => ({ ...p, cin: e.target.value }))} />
                    <Input placeholder="Tel (optional)" value={companyData.tel ?? ''} onChange={(e) => setCompanyData((p) => ({ ...p, tel: e.target.value }))} />
                    <Input placeholder="Email (optional)" value={companyData.email ?? ''} onChange={(e) => setCompanyData((p) => ({ ...p, email: e.target.value }))} className="sm:col-span-2" />
                  </div>
                </ProfileEditor>
              }
              list={
                <ProfileList
                  title={listTitle}
                  rows={activeRows}
                  onView={viewObject}
                  onEdit={startEdit}
                  onDelete={deleteObject}
                  onSetDefault={setDefault}
                />
              }
            />
          </TabsContent>
        </div>
      </Tabs>

      <ProfileDetailDialog
        content={viewingProfile}
        open={viewingProfile !== null}
        onOpenChange={(open) => {
          if (!open) setViewingProfile(null)
        }}
      />
    </div>
  )
}

function ProfileEditor(props: {
  alias: string
  setAlias: (value: string) => void
  editingId: string | null
  saving: boolean
  onCancel: () => void
  onSave: () => void
  onNew: () => void
  children: ReactNode
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">{props.editingId ? 'Edit profile' : 'Create profile'}</CardTitle>
            <CardDescription>Alias is mandatory. Set one profile as default from the list.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={props.onNew}>
            <Plus className="mr-2 size-4" /> New
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          placeholder="Alias (e.g. Factory Main Account)"
          value={props.alias}
          onChange={(e) => props.setAlias(e.target.value)}
        />
        {props.children}
        <div className="flex flex-wrap gap-2">
          <Button onClick={props.onSave} disabled={props.saving}>
            {props.saving ? 'Saving...' : props.editingId ? 'Update Profile' : 'Create Profile'}
          </Button>
          <Button variant="outline" onClick={props.onCancel}>Clear</Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ProfileList(props: {
  title: string
  rows: InvoiceSettingProfile[]
  onView: (row: InvoiceSettingProfile) => void
  onEdit: (row: InvoiceSettingProfile) => void
  onDelete: (id: string) => void
  onSetDefault: (id: string) => void
}) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{props.title}</CardTitle>
        <CardDescription>
          {props.rows.length === 0
            ? 'No profiles yet.'
            : `${props.rows.length} profile${props.rows.length === 1 ? '' : 's'}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="max-h-[min(70vh,640px)] space-y-2 overflow-y-auto">
        {props.rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Create your first profile using the form.</p>
        ) : null}
        {props.rows.map((row) => (
          <SavedProfileRow
            key={row.id}
            alias={row.alias}
            isDefault={row.is_default}
            defaultLabel="Default profile"
            notDefaultLabel="Not default"
            onView={() => props.onView(row)}
            onEdit={() => props.onEdit(row)}
            onDelete={() => props.onDelete(row.id)}
            onSetDefault={() => props.onSetDefault(row.id)}
          />
        ))}
      </CardContent>
    </Card>
  )
}
