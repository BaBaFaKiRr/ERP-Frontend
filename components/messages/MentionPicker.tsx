'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

export type MentionOption = {
  id: string
  label: string
  sublabel?: string
  type: string
  object_type?: string
}

export function MentionPicker({
  open,
  options,
  activeIndex,
  onSelect,
  onHover,
  mode,
}: {
  open: boolean
  options: MentionOption[]
  activeIndex: number
  onSelect: (opt: MentionOption) => void
  onHover: (index: number) => void
  mode: 'user' | 'object'
}) {
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIndex}"]`)
    if (el instanceof HTMLElement) el.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  if (!open) return null

  return (
    <div
      ref={listRef}
      className="absolute bottom-full left-0 z-50 mb-2 max-h-56 w-80 overflow-auto rounded-lg border bg-popover p-1 shadow-lg"
    >
      <div className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {mode === 'user' ? 'People' : 'ERP records'}
      </div>
      {options.length === 0 ? (
        <div className="px-3 py-4 text-sm text-muted-foreground">No matches</div>
      ) : (
        options.map((opt, i) => (
          <button
            key={`${opt.type}-${opt.id}`}
            type="button"
            data-idx={i}
            className={cn(
              'flex w-full flex-col rounded-md px-3 py-2 text-left text-sm',
              i === activeIndex ? 'bg-accent' : 'hover:bg-muted/60',
            )}
            onMouseEnter={() => onHover(i)}
            onClick={() => onSelect(opt)}
          >
            <span className="font-medium">
              {mode === 'user' ? `@${opt.label}` : `#${opt.label}`}
            </span>
            {opt.sublabel ? (
              <span className="text-xs text-muted-foreground">{opt.sublabel}</span>
            ) : null}
          </button>
        ))
      )}
    </div>
  )
}
