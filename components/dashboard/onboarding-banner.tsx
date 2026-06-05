'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight, ChevronUp } from 'lucide-react'
import { useOrganization } from '@/lib/organization-context'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'

function collapsedStorageKey(orgId: string): string {
  return `erp-onboarding-banner-collapsed:${orgId}`
}

export function OnboardingBanner() {
  const { onboarding, currentOrganizationId } = useOrganization()
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !currentOrganizationId) return
    setCollapsed(localStorage.getItem(collapsedStorageKey(currentOrganizationId)) === '1')
  }, [mounted, currentOrganizationId])

  const setCollapsedPersist = (value: boolean) => {
    setCollapsed(value)
    if (!currentOrganizationId) return
    if (value) {
      localStorage.setItem(collapsedStorageKey(currentOrganizationId), '1')
    } else {
      localStorage.removeItem(collapsedStorageKey(currentOrganizationId))
    }
  }

  if (!onboarding?.showOnboardingBanner) return null

  if (collapsed) {
    return (
      <div className="flex shrink-0 justify-center">
        <button
          type="button"
          onClick={() => setCollapsedPersist(false)}
          className="flex items-center gap-1 rounded-b-md border border-t-0 border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900 shadow-sm transition-colors hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-950/60 dark:text-amber-100 dark:hover:bg-amber-950/80"
          aria-expanded={false}
          aria-label="Show complete setup prompt"
        >
          <ChevronDown className="size-3.5 shrink-0" aria-hidden />
          Complete setup
        </button>
      </div>
    )
  }

  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-amber-200 bg-amber-50 px-2 py-2.5 dark:border-amber-500/30 dark:bg-amber-950/50">
      <Link
        href="/onboarding"
        className="flex min-w-0 flex-1 items-center gap-4 rounded-md px-2 py-0.5 transition-colors hover:bg-amber-100/90 dark:hover:bg-amber-950/70"
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
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="shrink-0 text-amber-900 hover:bg-amber-100/90 hover:text-amber-950 dark:text-amber-200 dark:hover:bg-amber-950/70 dark:hover:text-amber-50"
        onClick={() => setCollapsedPersist(true)}
        aria-expanded
        aria-label="Hide complete setup prompt"
      >
        <ChevronUp className="size-4" />
        Hide
      </Button>
    </div>
  )
}
