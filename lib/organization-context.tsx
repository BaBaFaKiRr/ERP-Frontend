'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  getActiveOrganizationId,
  setActiveOrganizationId,
  type MeOnboardingSummary,
  type MeResponse,
  type OrganizationSummary,
} from '@/lib/organization-store'
import { erpFetch } from '@/lib/erp-api'
import { shouldAutoRedirectToChecklist } from '@/lib/post-auth-routing'

type OrganizationContextValue = {
  loading: boolean
  me: MeResponse | null
  onboarding: MeOnboardingSummary | null
  organizations: OrganizationSummary[]
  currentOrganizationId: string | null
  currentOrganization: OrganizationSummary | null
  moduleRoles: string[]
  permissions: string[]
  permissionBypass: boolean
  membershipRole: string | null
  isPlatformAdmin: boolean
  refresh: () => Promise<void>
  switchOrganization: (organizationId: string) => Promise<void>
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null)

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState<MeResponse | null>(null)
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([])
  const [currentOrganizationId, setCurrentOrganizationId] = useState<string | null>(null)
  const [moduleRoles, setModuleRoles] = useState<string[]>([])
  const [permissions, setPermissions] = useState<string[]>([])
  const [permissionBypass, setPermissionBypass] = useState(false)
  const [membershipRole, setMembershipRole] = useState<string | null>(null)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)

  const applyMe = useCallback((next: MeResponse) => {
    const orgs = next.organizations ?? []
    setMe(next)
    setOrganizations(orgs)
    setIsPlatformAdmin(!!next.isPlatformAdmin)
    setModuleRoles(next.moduleRoles ?? [])
    setPermissions(next.permissions ?? [])
    setPermissionBypass(!!next.permissionBypass)

    const stored = getActiveOrganizationId()
    const validStored = stored && orgs.some((o) => o.id === stored) ? stored : null
    const activeId =
      validStored ??
      next.activeOrganization?.id ??
      (orgs.length === 1 ? orgs[0].id : null)

    if (activeId) {
      setActiveOrganizationId(activeId)
      setCurrentOrganizationId(activeId)
      const org = orgs.find((o) => o.id === activeId)
      setMembershipRole(org?.membershipRole ?? next.activeOrganization?.membershipRole ?? null)
    } else {
      setActiveOrganizationId(null)
      setCurrentOrganizationId(null)
      setMembershipRole(null)
    }
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const next = await erpFetch<MeResponse>('/api/me')
      applyMe(next)
    } finally {
      setLoading(false)
    }
  }, [applyMe])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (loading || !me) return

    const needsSetup = me.onboarding?.needsSetupWizard ?? me.onboarding?.needsWizard ?? false

    if (needsSetup && !pathname?.startsWith('/onboarding')) {
      router.replace('/onboarding')
      return
    }

    if (
      shouldAutoRedirectToChecklist(me) &&
      pathname?.startsWith('/dashboard') &&
      !pathname?.startsWith('/onboarding')
    ) {
      router.replace('/onboarding')
    }
  }, [loading, me, pathname, router])

  const switchOrganization = useCallback(
    async (organizationId: string) => {
      await erpFetch(`/api/organizations/${organizationId}/switch`, { method: 'POST' })
      setActiveOrganizationId(organizationId)
      setCurrentOrganizationId(organizationId)
      const org = organizations.find((o) => o.id === organizationId)
      setMembershipRole(org?.membershipRole ?? null)
      await refresh()
    },
    [organizations, refresh],
  )

  const currentOrganization = useMemo(
    () => (organizations ?? []).find((o) => o.id === currentOrganizationId) ?? null,
    [organizations, currentOrganizationId],
  )

  const value = useMemo(
    () => ({
      loading,
      me,
      onboarding: me?.onboarding ?? null,
      organizations,
      currentOrganizationId,
      currentOrganization,
      moduleRoles,
      permissions,
      permissionBypass,
      membershipRole,
      isPlatformAdmin,
      refresh,
      switchOrganization,
    }),
    [
      loading,
      me,
      organizations,
      currentOrganizationId,
      currentOrganization,
      moduleRoles,
      permissions,
      permissionBypass,
      membershipRole,
      isPlatformAdmin,
      refresh,
      switchOrganization,
    ],
  )

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>
}

export function useOrganization(): OrganizationContextValue {
  const ctx = useContext(OrganizationContext)
  if (!ctx) {
    throw new Error('useOrganization must be used within OrganizationProvider')
  }
  return ctx
}
