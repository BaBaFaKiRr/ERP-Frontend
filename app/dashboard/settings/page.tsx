'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Building2,
  Database,
  DollarSign,
  Settings2,
  ShoppingCart,
  User,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { erpFetch } from '@/lib/erp-api'
import { useOrganization } from '@/lib/organization-context'
import type { MeResponse } from '@/lib/organization-store'

type SettingsLink = {
  title: string
  description: string
  href: string
  icon: typeof DollarSign
}

const MODULE_LINKS: SettingsLink[] = [
  {
    title: 'Preferences',
    description: 'Document numbering and nomenclature for orders, invoices, and more',
    href: '/dashboard/settings/preferences',
    icon: Settings2,
  },
  {
    title: 'Accounts',
    description: 'Invoice terms, bank details, and company profiles',
    href: '/dashboard/finance/settings',
    icon: DollarSign,
  },
  {
    title: 'Purchase',
    description: 'Purchase module preferences and defaults',
    href: '/dashboard/purchase/settings',
    icon: ShoppingCart,
  },
  {
    title: 'Import / Export',
    description: 'Bulk import and export for suppliers, customers, and items',
    href: '/dashboard/import-export?from=settings',
    icon: Database,
  },
]

export default function SettingsPage() {
  const {
    loading: orgLoading,
    currentOrganization,
    membershipRole,
    moduleRoles,
    isPlatformAdmin,
  } = useOrganization()
  const [me, setMe] = useState<MeResponse['user'] | null>(null)
  const [loadingMe, setLoadingMe] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setLoadingMe(true)
      setError(null)
      try {
        const res = await erpFetch<MeResponse>('/api/me')
        setMe(res.user)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load profile')
      } finally {
        setLoadingMe(false)
      }
    })()
  }, [])

  const displayName =
    me && `${me.firstName ?? ''} ${me.lastName ?? ''}`.trim()
      ? `${me.firstName ?? ''} ${me.lastName ?? ''}`.trim()
      : (me?.email ?? '—')

  const loading = orgLoading || loadingMe

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="mt-2 text-gray-600 dark:text-slate-400">
          Your profile, workspace, and module configuration
        </p>
      </div>

      {error ? (
        <p className="mb-6 text-sm text-destructive">{error}</p>
      ) : null}

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="size-5 text-muted-foreground" />
              Profile
            </CardTitle>
            <CardDescription>Signed-in user for this workspace</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {loading ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : (
              <>
                <p>
                  <span className="text-muted-foreground">Name</span>
                  <br />
                  <span className="font-medium">{displayName}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Email</span>
                  <br />
                  <span className="font-medium">{me?.email ?? '—'}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">App role</span>
                  <br />
                  <span className="font-medium capitalize">{me?.role ?? '—'}</span>
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="size-5 text-muted-foreground" />
              Organization
            </CardTitle>
            <CardDescription>Active company workspace</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {orgLoading ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : currentOrganization ? (
              <>
                <p>
                  <span className="text-muted-foreground">Company</span>
                  <br />
                  <span className="font-medium">{currentOrganization.name}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Slug</span>
                  <br />
                  <span className="font-mono text-xs">{currentOrganization.slug}</span>
                </p>
                {membershipRole ? (
                  <p>
                    <span className="text-muted-foreground">Membership</span>
                    <br />
                    <span className="font-medium capitalize">{membershipRole}</span>
                  </p>
                ) : null}
                {moduleRoles.length > 0 ? (
                  <p>
                    <span className="text-muted-foreground">Module roles</span>
                    <br />
                    <span className="font-medium">
                      {moduleRoles.map((r) => r.replace(/_/g, ' ')).join(', ')}
                    </span>
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-muted-foreground">
                No organization selected.{' '}
                <Link href="/dashboard/org-setup" className="text-primary underline-offset-4 hover:underline">
                  Set up a workspace
                </Link>
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Module settings</h2>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {MODULE_LINKS.map((item) => {
          const Icon = item.icon
          return (
            <Card key={item.href} className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="size-5 text-muted-foreground" />
                  {item.title}
                </CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <Button variant="outline" className="w-full" asChild>
                  <Link href={item.href}>
                    Open
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )
        })}
        {isPlatformAdmin ? (
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-base">System admin</CardTitle>
              <CardDescription>Platform administration tools</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button variant="outline" className="w-full" asChild>
                <Link href="/dashboard/admin?from=settings">
                  Admin panel
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
