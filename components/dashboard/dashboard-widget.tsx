'use client'

import { Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type PeriodOption = { value: string; label: string }

export function DashboardWidget({
  title,
  period,
  periodOptions,
  onPeriodChange,
  className,
  children,
  emptyMessage,
  isEmpty,
}: {
  title: string
  period?: string
  periodOptions?: PeriodOption[]
  onPeriodChange?: (value: string) => void
  className?: string
  children?: React.ReactNode
  emptyMessage?: string
  isEmpty?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-lg border border-[#e2e8f0] bg-white shadow-sm',
        'dark:border-white/10 dark:bg-[#1a1f2e] dark:shadow-none',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[#e8edf3] px-4 py-3 dark:border-white/10">
        <h3 className="text-sm font-semibold text-[#1e293b] dark:text-slate-100">{title}</h3>
        {periodOptions && period != null && onPeriodChange ? (
          <Select value={period} onValueChange={onPeriodChange}>
            <SelectTrigger
              size="sm"
              className="h-7 w-auto gap-1 border-0 bg-transparent text-xs text-[#64748b] shadow-none dark:text-slate-400"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>
      <div className="min-h-[140px] flex-1 p-4">
        {isEmpty ? (
          <div className="flex h-full min-h-[120px] flex-col items-center justify-center rounded-md border border-dashed border-[#bfdbfe] bg-[#eff6ff]/60 px-4 text-center dark:border-[#3b82f6]/30 dark:bg-[#1e3a5f]/20">
            <Lightbulb className="mb-2 size-8 text-[#3b82f6]" strokeWidth={1.5} />
            <p className="text-sm text-[#475569] dark:text-slate-300">
              {emptyMessage ?? 'Data will appear here as you use the ERP.'}
            </p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
