'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import type { OnboardingState } from '@/lib/organization-store'
import { OnboardingChecklist } from '@/components/onboarding/onboarding-checklist'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function GettingStartedWidget() {
  const [state, setState] = useState<OnboardingState | null>(null)
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await erpFetch<OnboardingState>('/api/onboarding')
      setState(data)
    } catch {
      setState(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading || !state) return null
  if (state.progress.isComplete || state.progress.checklistDismissed) return null

  if (collapsed) {
    return (
      <Card className="mb-6 border-[#dbeafe] bg-gradient-to-r from-[#eff6ff] to-white dark:from-[#1e3a5f]/30 dark:to-[#1a1f2e]">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <Sparkles className="size-5 text-[#2563eb]" />
            <div>
              <p className="text-sm font-medium">Getting started</p>
              <p className="text-xs text-muted-foreground">
                {state.progress.progressPercent}% of setup complete
              </p>
            </div>
            <Progress value={state.progress.progressPercent} className="h-1.5 w-32" />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setCollapsed(false)}>
              Expand
            </Button>
            <Button type="button" size="sm" asChild>
              <Link href="/onboarding">View all steps</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mb-6 border-[#dbeafe] dark:border-[#3b82f6]/25">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="size-5 text-[#2563eb]" />
              Getting started
            </CardTitle>
            <CardDescription>
              Complete these steps to configure LEJER for your team. You can skip any step and
              return later.
            </CardDescription>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => setCollapsed(true)}>
            Minimize
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <OnboardingChecklist state={state} onRefresh={load} compact />
        <div className="mt-3 text-right">
          <Button type="button" variant="link" size="sm" asChild>
            <Link href="/onboarding">Open full setup guide</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
