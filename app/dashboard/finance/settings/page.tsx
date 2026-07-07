'use client'

import { SettingsPageShell } from '@/components/settings/settings-page-shell'
import { InvoiceProfilesSection } from '@/components/settings/invoice-profiles-section'

export default function AccountsSettingsPage() {
  return (
    <SettingsPageShell
      title="Accounts Settings"
      description="Create reusable terms, bank details, and company details with aliases and defaults for invoice generation."
      backLink={{ href: '/dashboard/settings', label: 'Back to Settings' }}
    >
      <InvoiceProfilesSection />
    </SettingsPageShell>
  )
}
