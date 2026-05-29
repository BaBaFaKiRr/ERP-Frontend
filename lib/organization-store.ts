const LS_KEY = 'erp-active-org-id'

let memoryOrgId: string | null = null

export function getActiveOrganizationId(): string | null {
  if (memoryOrgId) return memoryOrgId
  if (typeof window !== 'undefined') {
    return localStorage.getItem(LS_KEY)
  }
  return null
}

export function setActiveOrganizationId(id: string | null): void {
  memoryOrgId = id
  if (typeof window === 'undefined') return
  if (id) localStorage.setItem(LS_KEY, id)
  else localStorage.removeItem(LS_KEY)
}

export type OrganizationSummary = {
  id: string
  name: string
  slug: string
  status?: string
  subscriptionPlan?: string
  membershipRole?: string
}

export type MeOnboardingSummary = {
  needsSetupWizard: boolean
  /** @deprecated Use needsSetupWizard */
  needsWizard?: boolean
  shouldRedirectToChecklist: boolean
  showOnboardingBanner: boolean
  wizardStep: number
  progressPercent: number
  checklistVisible?: boolean
  isComplete: boolean
}

export type MeResponse = {
  user: {
    id: string
    email: string
    firstName?: string | null
    lastName?: string | null
    phone?: string | null
    designation?: string | null
    role: string
  }
  isPlatformAdmin: boolean
  organizations: OrganizationSummary[]
  activeOrganization: { id: string; name: string; slug: string; membershipRole: string } | null
  moduleRoles: string[]
  onboarding: MeOnboardingSummary
}

export type OnboardingTaskStatus = 'pending' | 'skipped' | 'completed'

export type OnboardingTask = {
  key: string
  title: string
  description: string
  href: string
  importSegment?: string
  status: OnboardingTaskStatus
  completedAt: string | null
  skippedAt: string | null
}

export type OnboardingState = {
  progress: {
    wizardCompleted: boolean
    wizardStep: number
    progressPercent: number
    checklistDismissed: boolean
    checklistIntroSeen?: boolean
    completedAt: string | null
    isComplete: boolean
  }
  tasks: OnboardingTask[]
}

/** Marks the one-time checklist gate complete (no more auto-redirect). */
export async function completeChecklistIntro(
  fetcher: (path: string, init?: { method?: string; body?: object }) => Promise<unknown>,
): Promise<void> {
  await fetcher('/api/onboarding/progress', {
    method: 'PATCH',
    body: { checklistIntroSeen: true },
  })
}
