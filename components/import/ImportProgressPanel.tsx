'use client'

import { Loader2 } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { ImportProgressUpdate } from '@/lib/erp-api'

type ImportProgressPanelProps = {
  progress: ImportProgressUpdate | null
  fileName?: string | null
  className?: string
}

function phaseLabel(phase: ImportProgressUpdate['phase']): string {
  if (phase === 'uploading') return 'Uploading'
  if (phase === 'parsing') return 'Reading file'
  if (phase === 'validating') return 'Validating'
  return 'Importing'
}

export function ImportProgressPanel({ progress, fileName, className }: ImportProgressPanelProps) {
  if (!progress) return null

  const { phase, processed, total, imported, skipped, message } = progress
  const hasTotal = total > 0
  const percent = hasTotal ? Math.min(100, Math.round((processed / total) * 100)) : 0
  const isIndeterminate = phase === 'uploading' || (phase === 'validating' && processed === 0 && total > 0)

  return (
    <div
      className={cn(
        'rounded-lg border bg-gradient-to-br from-primary/5 via-background to-background p-4 shadow-sm space-y-4',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy={percent < 100}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium">
            {(isIndeterminate || (hasTotal && percent < 100)) && (
              <Loader2 className="size-4 shrink-0 animate-spin text-primary" aria-hidden />
            )}
            <span>{phaseLabel(phase)}</span>
            {fileName ? (
              <span className="truncate text-muted-foreground font-normal">· {fileName}</span>
            ) : null}
          </div>
          {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
        </div>
        {hasTotal ? (
          <span className="text-2xl font-semibold tabular-nums tracking-tight shrink-0">
            {processed}
            <span className="text-base font-normal text-muted-foreground"> / {total}</span>
          </span>
        ) : null}
      </div>

      <div className="space-y-2">
        <Progress
          value={isIndeterminate ? undefined : percent}
          className={cn('h-2.5', isIndeterminate && '[&_[data-slot=progress-indicator]]:animate-pulse')}
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{hasTotal ? `${percent}% complete` : 'Preparing…'}</span>
          {phase === 'importing' || imported > 0 || skipped > 0 ? (
            <span className="tabular-nums">
              <span className="text-emerald-600 dark:text-emerald-400">{imported} imported</span>
              {skipped > 0 ? (
                <>
                  {' · '}
                  <span className="text-amber-600 dark:text-amber-400">{skipped} skipped</span>
                </>
              ) : null}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}
