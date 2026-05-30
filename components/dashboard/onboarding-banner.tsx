'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { useOrganization } from '@/lib/organization-context'
import { Progress } from '@/components/ui/progress'

export function OnboardingBanner() {
  const { onboarding } = useOrganization()

  if (!onboarding?.showOnboardingBanner) return null

  return (
    <Link
      href="/onboarding"
      className="flex shrink-0 items-center gap-4 border-b border-amber-200 bg-amber-50 px-4 py-2.5 transition-colors hover:bg-amber-100/90 dark:border-amber-500/30 dark:bg-amber-950/50 dark:hover:bg-amber-950/70"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-amber-950 dark:text-amber-100">
          Complete your LEJER setup
        </p>
        <p className="text-xs text-amber-800/90 dark:text-amber-200/80">
          {onboarding.progressPercent}% done — import data, configure modules, and invite your team
        </p>
        <Progress
          value={onboarding.progressPercent}
          className="mt-2 h-1.5 bg-amber-200/80 dark:bg-amber-900/60 [&>div]:bg-amber-600"
        />
      </div>
      <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-amber-900 dark:text-amber-200">
        Continue setup
        <ChevronRight className="size-4" />
      </span>
    </Link>
  )
}
