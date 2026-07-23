'use client'

import { cn } from '@/lib/utils'

export function UnreadBadge({ count, className }: { count: number; className?: string }) {
  if (!count || count <= 0) return null
  return (
    <span
      className={cn(
        'inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-semibold text-white',
        className,
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
