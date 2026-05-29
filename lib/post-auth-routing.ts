import type { MeResponse } from '@/lib/organization-store'

/** Where to send the user immediately after login or signup. */
export function resolvePostAuthPath(me: MeResponse): string {
  if (me.onboarding?.needsSetupWizard ?? me.onboarding?.needsWizard) {
    return '/onboarding'
  }
  return '/dashboard'
}

/** One-time redirect from dashboard to the checklist (handled in OrganizationProvider). */
export function shouldAutoRedirectToChecklist(me: MeResponse): boolean {
  return Boolean(me.onboarding?.shouldRedirectToChecklist)
}
