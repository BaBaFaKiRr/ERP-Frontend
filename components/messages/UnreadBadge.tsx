'use client'

import { cn } from '@/lib/utils'

/** Numeric unread count badge (e.g. notification dropdown). */
export function UnreadBadge({ count, className }: { count: number; className?: string }) {
  if (!count || count <= 0) return null
  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white',
        className,
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

/** Simple red unread indicator. */
export function UnreadDot({
  show,
  className,
  title,
}: {
  show: boolean
  className?: string
  title?: string
}) {
  if (!show) return null
  return (
    <span
      title={title}
      aria-label={title ?? 'Unread messages'}
      className={cn('inline-block h-2 w-2 shrink-0 rounded-full bg-red-500', className)}
    />
  )
}
