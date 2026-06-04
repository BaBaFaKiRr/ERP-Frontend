'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, RotateCcw } from 'lucide-react'
import { useOrganization } from '@/lib/organization-context'
import {
  fetchPermissionCatalog,
  fetchPermissionUsers,
  fetchUserPermissions,
  resetUserPermissions,
  saveUserPermissions,
  type PermissionCatalogModule,
  type PermissionUserRow,
} from '@/lib/permissions-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const ACTION_LABELS: Record<string, string> = {
  fetch: 'View',
  create: 'Create',
  update: 'Update',
  delete: 'Delete',
  approve: 'Approve',
  reject: 'Reject',
  request: 'Request',
  dispatch: 'Dispatch',
  import: 'Import',
  export: 'Export',
  settings: 'Settings',
}

function userLabel(u: PermissionUserRow) {
  const name = u.fullName?.trim() || 'Employee'
  const code = u.employeeCode ? ` (${u.employeeCode})` : ''
  return `${name}${code}`
}

export default function AdminPermissionsPage() {
  const router = useRouter()
  const { membershipRole, moduleRoles, loading: orgLoading } = useOrganization()

  const isOrgAdmin = useMemo(() => {
    if (membershipRole === 'owner' || membershipRole === 'admin') return true
    return moduleRoles.includes('erp_admin')
  }, [membershipRole, moduleRoles])

  const [catalog, setCatalog] = useState<PermissionCatalogModule[]>([])
  const [users, setUsers] = useState<PermissionUserRow[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [draft, setDraft] = useState<Set<string>>(new Set())
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [moduleRole, setModuleRole] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (orgLoading) return
    if (!isOrgAdmin) {
      router.replace('/dashboard')
    }
  }, [orgLoading, isOrgAdmin, router])

  useEffect(() => {
    if (!isOrgAdmin) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const [cat, list] = await Promise.all([fetchPermissionCatalog(), fetchPermissionUsers()])
        if (cancelled) return
        setCatalog(cat.modules)
        setUsers(list.data)
        if (list.data.length > 0) {
          setSelectedUserId((prev) => prev || list.data[0].userId)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isOrgAdmin])

  const loadUser = useCallback(async (userId: string) => {
    if (!userId) return
    setError(null)
    try {
      const data = await fetchUserPermissions(userId)
      const set = new Set(data.permissions)
      setDraft(set)
      setSaved(set)
      setModuleRole(data.moduleRole)
      setDirty(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load user permissions')
    }
  }, [])

  useEffect(() => {
    if (selectedUserId) void loadUser(selectedUserId)
  }, [selectedUserId, loadUser])

  const selectedUser = users.find((u) => u.userId === selectedUserId)

  const toggle = (key: string, on: boolean) => {
    setDraft((prev) => {
      const next = new Set(prev)
      if (on) next.add(key)
      else next.delete(key)
      return next
    })
    setDirty(true)
  }

  const handleSave = async () => {
    if (!selectedUserId) return
    setSaving(true)
    setError(null)
    try {
      const data = await saveUserPermissions(selectedUserId, [...draft])
      setDraft(new Set(data.permissions))
      setSaved(new Set(data.permissions))
      setDirty(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (!selectedUserId) return
    setSaving(true)
    setError(null)
    try {
      const data = await resetUserPermissions(selectedUserId)
      setDraft(new Set(data.permissions))
      setSaved(new Set(data.permissions))
      setModuleRole(data.moduleRole)
      setDirty(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reset')
    } finally {
      setSaving(false)
    }
  }

  const setModuleFetchAll = (mod: PermissionCatalogModule, enabled: boolean) => {
    setDraft((prev) => {
      const next = new Set(prev)
      for (const res of mod.resources) {
        if (res.adminOnly) continue
        for (const p of res.permissions) {
          if (p.adminOnly) continue
          if (p.action === 'fetch') {
            if (enabled) next.add(p.key)
            else next.delete(p.key)
          }
        }
      }
      return next
    })
    setDirty(true)
  }

  if (orgLoading || !isOrgAdmin) {
    return (
      <div className="p-8 text-muted-foreground">
        Loading…
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b bg-background px-8 py-6">
        <Link
          href="/dashboard/admin"
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Admin
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Permissions</h1>
        <p className="mt-1 text-muted-foreground">
          Manage module-wise access for employees with ERP login (org members only).
        </p>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-8 py-6">
        {error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select user</CardTitle>
            <CardDescription>Only members with active login credentials are listed.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-4">
            <div className="min-w-[280px] flex-1">
              <Label htmlFor="perm-user">Employee</Label>
              <Select
                value={selectedUserId}
                onValueChange={setSelectedUserId}
                disabled={loading || users.length === 0}
              >
                <SelectTrigger id="perm-user" className="mt-1.5">
                  <SelectValue placeholder={loading ? 'Loading…' : 'Select employee'} />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.userId} value={u.userId}>
                      {userLabel(u)}
                      {u.email ? ` — ${u.email}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedUser ? (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{selectedUser.department ?? '—'}</span>
                {' · '}
                Module role:{' '}
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  {(moduleRole || selectedUser.moduleRoles[0]) ?? '—'}
                </span>
              </div>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!selectedUserId || saving}
              onClick={() => void handleReset()}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset to role defaults
            </Button>
          </CardContent>
        </Card>

        {users.length === 0 && !loading ? (
          <p className="text-muted-foreground">No members with ERP login yet. Invite employees from HR.</p>
        ) : null}

        {selectedUserId && catalog.length > 0 ? (
          <Accordion type="multiple" className="space-y-2" defaultValue={catalog.map((m) => m.id)}>
            {catalog.map((mod) => {
              const editableResources = mod.resources.filter((r) => !r.adminOnly)
              if (editableResources.length === 0) return null
              return (
                <AccordionItem key={mod.id} value={mod.id} className="rounded-lg border px-4">
                  <div className="flex items-center gap-2 border-b border-transparent">
                    <AccordionTrigger className="min-w-0 flex-1 py-4 hover:no-underline">
                      <span className="font-semibold">{mod.label}</span>
                    </AccordionTrigger>
                    <div className="flex shrink-0 gap-2 pr-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setModuleFetchAll(mod, true)}
                      >
                        Enable all view
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setModuleFetchAll(mod, false)}
                      >
                        Disable all view
                      </Button>
                    </div>
                  </div>
                  <AccordionContent className="space-y-4 pb-4">
                    {editableResources.map((res) => (
                      <div key={res.id} className="rounded-md border bg-muted/20 p-4">
                        <p className="mb-3 font-medium">{res.label}</p>
                        <div className="flex flex-wrap gap-x-6 gap-y-3">
                          {res.permissions
                            .filter((p) => !p.adminOnly)
                            .map((p) => {
                              const on = draft.has(p.key)
                              const wasSaved = saved.has(p.key)
                              return (
                                <div key={p.key} className="flex items-center gap-2">
                                  <Switch
                                    id={p.key}
                                    checked={on}
                                    onCheckedChange={(v) => toggle(p.key, v)}
                                  />
                                  <Label
                                    htmlFor={p.key}
                                    className={cn(
                                      'cursor-pointer text-sm font-normal',
                                      on !== wasSaved && dirty && 'text-amber-700 dark:text-amber-400',
                                    )}
                                  >
                                    {ACTION_LABELS[p.action] ?? p.action}
                                  </Label>
                                </div>
                              )
                            })}
                        </div>
                      </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        ) : null}
      </div>

      {selectedUserId ? (
        <div className="sticky bottom-0 border-t bg-background px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {dirty ? 'Unsaved changes' : `${draft.size} permissions granted`}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!dirty || saving}
                onClick={() => {
                  setDraft(new Set(saved))
                  setDirty(false)
                }}
              >
                Discard
              </Button>
              <Button type="button" disabled={!dirty || saving} onClick={() => void handleSave()}>
                {saving ? 'Saving…' : 'Save permissions'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
