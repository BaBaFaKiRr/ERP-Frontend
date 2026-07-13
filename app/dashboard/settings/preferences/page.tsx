'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useOrganization } from '@/lib/organization-context'
import { erpFetch } from '@/lib/erp-api'
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
import { Badge } from '@/components/ui/badge'

type NomenclaturePattern =
  | 'prefix_base'
  | 'prefix_base_sub'
  | 'prefix_year_serial'
  | 'prefix_fy_serial'
  | 'prefix_serial'

type NomenclatureProfile = {
  document_type: string
  label: string
  prefix: string
  separator: string
  pattern: NomenclaturePattern
  serial_padding: number
  sub_serial_padding: number
  group_key: string
}

const GROUP_LABELS: Record<string, string> = {
  sales: 'Sales & Dispatch',
  purchase: 'Purchase',
  finance: 'Finance',
  inventory: 'Inventory & Production',
  master: 'Master Data',
}

const PATTERN_LABELS: Record<NomenclaturePattern, string> = {
  prefix_base: 'Prefix + Year-Serial',
  prefix_base_sub: 'Prefix + Base + Sub-counter',
  prefix_year_serial: 'Prefix + Year + Serial',
  prefix_fy_serial: 'Prefix + Financial Year + Serial',
  prefix_serial: 'Prefix + Serial',
}

function patternHint(pattern: NomenclaturePattern): string {
  switch (pattern) {
    case 'prefix_base':
      return 'Example: SL-2026-00001'
    case 'prefix_base_sub':
      return 'Example: WO-2026-00001-001'
    case 'prefix_year_serial':
      return 'Example: PO-2026-00001'
    case 'prefix_fy_serial':
      return 'Example: DN/25-26/0001'
    case 'prefix_serial':
      return 'Example: SUP-00001'
    default:
      return ''
  }
}

export default function PreferencesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading…</div>}>
      <PreferencesPageContent />
    </Suspense>
  )
}

function PreferencesPageContent() {
  const router = useRouter()
  const { membershipRole, moduleRoles, loading: orgLoading } = useOrganization()

  const isOrgAdmin = useMemo(() => {
    if (membershipRole === 'owner' || membershipRole === 'admin') return true
    return moduleRoles.includes('erp_admin')
  }, [membershipRole, moduleRoles])

  const [profiles, setProfiles] = useState<NomenclatureProfile[]>([])
  const [draft, setDraft] = useState<NomenclatureProfile[]>([])
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [activeGroup, setActiveGroup] = useState<string>('sales')

  useEffect(() => {
    if (orgLoading) return
    if (!isOrgAdmin) router.replace('/dashboard')
  }, [orgLoading, isOrgAdmin, router])

  useEffect(() => {
    if (!isOrgAdmin) return
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await erpFetch<{ data: NomenclatureProfile[] }>('/api/document-nomenclature')
        setProfiles(res.data ?? [])
        setDraft(res.data ?? [])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load nomenclature')
      } finally {
        setLoading(false)
      }
    })()
  }, [isOrgAdmin])

  const groups = useMemo(() => {
    const keys = [...new Set(draft.map((p) => p.group_key))]
    return keys
  }, [draft])

  const activeProfiles = useMemo(
    () => draft.filter((p) => p.group_key === activeGroup),
    [draft, activeGroup],
  )

  useEffect(() => {
    if (draft.length === 0) return
    void (async () => {
      const next: Record<string, string> = {}
      for (const profile of draft) {
        try {
          const res = await erpFetch<{ preview: string }>('/api/document-nomenclature/preview', {
            method: 'POST',
            body: {
              document_type: profile.document_type,
              prefix: profile.prefix,
              separator: profile.separator,
              pattern: profile.pattern,
              serial_padding: profile.serial_padding,
              sub_serial_padding: profile.sub_serial_padding,
            },
          })
          next[profile.document_type] = res.preview
        } catch {
          next[profile.document_type] = '—'
        }
      }
      setPreviews(next)
    })()
  }, [draft])

  const updateProfile = (documentType: string, patch: Partial<NomenclatureProfile>) => {
    setDraft((prev) =>
      prev.map((p) => (p.document_type === documentType ? { ...p, ...patch, prefix: patch.prefix?.toUpperCase() ?? p.prefix } : p)),
    )
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const res = await erpFetch<{ data: NomenclatureProfile[] }>('/api/document-nomenclature', {
        method: 'PUT',
        body: { profiles: draft },
      })
      setProfiles(res.data ?? [])
      setDraft(res.data ?? [])
      setMessage('Document nomenclature saved. New documents will use these formats.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    setDraft(profiles)
    setMessage(null)
    setError(null)
  }

  return (
    <SettingsPageShell
      title="Preferences"
      description="Customize how document numbers are generated for your organization. Each document type uses its own unique prefix."
      backLink={{ href: '/dashboard/settings', label: 'Back to Settings' }}
      status={
        <>
          {loading ? <p className="text-sm text-muted-foreground">Loading preferences...</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {message ? <p className="text-sm text-green-600">{message}</p> : null}
        </>
      }
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Document groups</CardTitle>
            <CardDescription>Select a module to configure</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {groups.map((group) => (
              <Button
                key={group}
                variant={activeGroup === group ? 'default' : 'outline'}
                className="w-full justify-start"
                onClick={() => setActiveGroup(group)}
              >
                {GROUP_LABELS[group] ?? group}
              </Button>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-9">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{GROUP_LABELS[activeGroup] ?? activeGroup}</h2>
              <p className="text-sm text-muted-foreground">
                Prefixes must be unique across all document types in your organization.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={reset} disabled={saving}>
                Reset
              </Button>
              <Button onClick={() => void save()} disabled={saving || loading}>
                {saving ? 'Saving...' : 'Save Preferences'}
              </Button>
            </div>
          </div>

          <SettingsSectionGrid columns={2}>
            {activeProfiles.map((profile) => (
              <Card key={profile.document_type}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{profile.label}</CardTitle>
                      <CardDescription>{PATTERN_LABELS[profile.pattern]}</CardDescription>
                    </div>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {previews[profile.document_type] ?? '…'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Prefix</Label>
                    <Input
                      value={profile.prefix}
                      maxLength={12}
                      onChange={(e) => updateProfile(profile.document_type, { prefix: e.target.value.toUpperCase() })}
                      placeholder="e.g. SL"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Separator</Label>
                    <Select
                      value={profile.separator}
                      onValueChange={(value) => updateProfile(profile.document_type, { separator: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="-">Hyphen (-)</SelectItem>
                        <SelectItem value="/">Slash (/)</SelectItem>
                        <SelectItem value="_">Underscore (_)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Pattern</Label>
                    <Select value={profile.pattern} disabled>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={profile.pattern}>{PATTERN_LABELS[profile.pattern]}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">{patternHint(profile.pattern)}</p>
                  </div>
                  {profile.pattern === 'prefix_year_serial' || profile.pattern === 'prefix_fy_serial' || profile.pattern === 'prefix_serial' ? (
                    <div className="space-y-1.5">
                      <Label>Serial padding</Label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={profile.serial_padding}
                        onChange={(e) =>
                          updateProfile(profile.document_type, { serial_padding: Number(e.target.value) || 5 })
                        }
                      />
                    </div>
                  ) : null}
                  {profile.pattern === 'prefix_base_sub' ? (
                    <div className="space-y-1.5">
                      <Label>Sub-counter padding</Label>
                      <Input
                        type="number"
                        min={1}
                        max={6}
                        value={profile.sub_serial_padding}
                        onChange={(e) =>
                          updateProfile(profile.document_type, { sub_serial_padding: Number(e.target.value) || 3 })
                        }
                      />
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </SettingsSectionGrid>
        </div>
      </div>
    </SettingsPageShell>
  )
}
