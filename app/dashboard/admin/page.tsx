'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SettingsPageShell } from '@/components/settings/settings-page-shell'
import { SettingsSectionGrid } from '@/components/settings/settings-split-layout'
import { Building2, Shield } from 'lucide-react'

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading…</div>}>
      <AdminPageContent />
    </Suspense>
  )
}

function AdminPageContent() {
  const searchParams = useSearchParams()
  const fromSettings = searchParams.get('from') === 'settings'
  const backHref = fromSettings ? '/dashboard/settings' : undefined
  const backLabel = fromSettings ? 'Back to Settings' : undefined

  return (
    <SettingsPageShell
      title="Admin Panel"
      description="System administration and organization configuration"
      backLink={backHref && backLabel ? { href: backHref, label: backLabel } : undefined}
    >
      <SettingsSectionGrid columns={2}>
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="size-5" />
              Permissions
            </CardTitle>
            <CardDescription>
              View and edit module-wise ERP access for employees with login
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <Button className="w-full" asChild>
              <Link href={`/dashboard/admin/permissions${fromSettings ? '?from=settings' : ''}`}>
                Manage Permissions
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="size-5" />
              Company Settings
            </CardTitle>
            <CardDescription>
              Organization details, invoice profiles, and business preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <Button className="w-full" asChild>
              <Link href={`/dashboard/admin/company-settings${fromSettings ? '?from=settings' : ''}`}>
                Configure Company
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-base">User Management</CardTitle>
            <CardDescription>Manage system users and roles</CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <Button className="w-full" variant="outline" disabled>
              Coming soon
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-base">Data Management</CardTitle>
            <CardDescription>Backup, restore, and manage data</CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <Button className="w-full" variant="outline" disabled>
              Coming soon
            </Button>
          </CardContent>
        </Card>
      </SettingsSectionGrid>
    </SettingsPageShell>
  )
}
