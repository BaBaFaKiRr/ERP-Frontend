'use client'

import { cn } from '@/lib/utils'
import type { MessageReaction } from '@/lib/communication-types'

const QUICK = ['👍', '❤️', '😂', '🎉', '👀']

export function ReactionBar({
  reactions,
  currentUserId,
  onToggle,
  className,
  /** Where the quick-emoji picker opens relative to the + button */
  pickerSide = 'top',
}: {
  reactions: MessageReaction[]
  currentUserId?: string | null
  onToggle: (emoji: string) => void
  className?: string
  pickerSide?: 'top' | 'left' | 'right'
}) {
  const pickerPos =
    pickerSide === 'left'
      ? 'right-full top-1/2 mr-1 -translate-y-1/2'
      : pickerSide === 'right'
        ? 'left-full top-1/2 ml-1 -translate-y-1/2'
        : 'bottom-full left-0 mb-1'

  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      {reactions.map((r) => {
        const mine = currentUserId ? r.user_ids.includes(currentUserId) : false
        return (
          <button
            key={r.emoji}
            type="button"
            onClick={() => onToggle(r.emoji)}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors',
              mine
                ? 'border-emerald-500/40 bg-emerald-500/10'
                : 'border-border bg-background hover:bg-muted',
            )}
          >
            <span>{r.emoji}</span>
            <span className="text-muted-foreground">{r.count}</span>
          </button>
        )
      })}
      <div className="relative">
        <button
          type="button"
          className="peer rounded-full border border-dashed bg-background px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted"
        >
          +
        </button>
        <div
          className={cn(
            'invisible absolute z-20 flex gap-0.5 rounded-lg border bg-popover p-1 shadow-md peer-hover:visible peer-focus-visible:visible hover:visible',
            pickerPos,
          )}
        >
          {QUICK.map((e) => (
            <button
              key={e}
              type="button"
              className="rounded p-1 hover:bg-muted"
              onClick={() => onToggle(e)}
            >
              {e}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
