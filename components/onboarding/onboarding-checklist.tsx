'use client'

import Link from 'next/link'
import { CheckCircle2, Circle, Download, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { OnboardingState, OnboardingTask } from '@/lib/organization-store'
import { erpFetch, erpFetchBlob, downloadBlob } from '@/lib/erp-api'

type Props = {
  state: OnboardingState
  onRefresh: () => Promise<void>
  compact?: boolean
}

async function downloadSample(segment: string) {
  const { blob, filename } = await erpFetchBlob(
    `/api/data-import-export/sample?segment=${segment}`,
  )
  downloadBlob(blob, filename ?? `import-${segment}-sample.csv`)
}

export function OnboardingChecklist({ state, onRefresh, compact }: Props) {
  const { progress, tasks } = state

  const handleSkip = async (task: OnboardingTask) => {
    await erpFetch(`/api/onboarding/tasks/${task.key}`, { method: 'PATCH' })
    await onRefresh()
  }

  const handleDismiss = async () => {
    await erpFetch('/api/onboarding/progress', {
      method: 'PATCH',
      body: { checklistDismissed: true },
    })
    await onRefresh()
  }

  return (
    <div className={cn('space-y-4', compact && 'space-y-3')}>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[#0f172a] dark:text-white">Setup progress</p>
            <p className="text-xs text-[#64748b] dark:text-slate-400">
              {progress.progressPercent}% complete — finish these steps to get the most from LEJER
            </p>
          </div>
          <span className="text-lg font-semibold tabular-nums text-[#2563eb]">
            {progress.progressPercent}%
          </span>
        </div>
        <Progress value={progress.progressPercent} className="h-2" />
      </div>

      <ul className="space-y-2">
        {tasks.map((task) => {
          const done = task.status === 'completed'
          const skipped = task.status === 'skipped'
          const Icon = done ? CheckCircle2 : Circle

          return (
            <li
              key={task.key}
              className={cn(
                'flex flex-col gap-2 rounded-lg border p-3 transition-colors sm:flex-row sm:items-center sm:justify-between',
                done || skipped
                  ? 'border-[#e2e8f0] bg-[#f8fafc]/80 dark:border-white/10 dark:bg-white/5'
                  : 'border-[#dbeafe] bg-white dark:border-[#3b82f6]/20 dark:bg-[#1a1f2e]',
              )}
            >
              <div className="flex min-w-0 flex-1 gap-3">
                <Icon
                  className={cn(
                    'mt-0.5 size-5 shrink-0',
                    done ? 'text-emerald-600' : skipped ? 'text-slate-400' : 'text-[#94a3b8]',
                  )}
                />
                <div className="min-w-0">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      done || skipped
                        ? 'text-[#64748b] line-through dark:text-slate-400'
                        : 'text-[#0f172a] dark:text-white',
                    )}
                  >
                    {task.title}
                  </p>
                  <p className="text-xs text-[#64748b] dark:text-slate-400">{task.description}</p>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2 pl-8 sm:pl-0">
                {task.importSegment && !done && !skipped ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => void downloadSample(task.importSegment!)}
                  >
                    <Download className="mr-1 size-3.5" />
                    Template
                  </Button>
                ) : null}
                {!done && !skipped ? (
                  <>
                    <Button type="button" variant="ghost" size="sm" className="h-8" asChild>
                      <Link href={task.href}>Open</Link>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-muted-foreground"
                      onClick={() => void handleSkip(task)}
                    >
                      <SkipForward className="mr-1 size-3.5" />
                      Skip
                    </Button>
                  </>
                ) : (
                  <span className="text-xs font-medium text-[#64748b] dark:text-slate-400">
                    {done ? 'Done' : 'Skipped'}
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {!compact && !progress.isComplete ? (
        <div className="flex flex-wrap justify-end gap-2 border-t border-[#e2e8f0] pt-4 dark:border-white/10">
          <Button type="button" variant="outline" onClick={() => void handleDismiss()}>
            Hide checklist
          </Button>
          <Button type="button" asChild>
            <Link href="/dashboard">Continue to dashboard</Link>
          </Button>
        </div>
      ) : null}
    </div>
  )
}
