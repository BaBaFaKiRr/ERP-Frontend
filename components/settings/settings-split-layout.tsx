'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type SettingsSectionGridProps = {
  children: ReactNode
  className?: string
  columns?: 1 | 2 | 3
}

export function SettingsSectionGrid({
  children,
  className,
  columns = 2,
}: SettingsSectionGridProps) {
  const columnClass =
    columns === 3
      ? 'md:grid-cols-2 xl:grid-cols-3'
      : columns === 2
        ? 'xl:grid-cols-2'
        : 'grid-cols-1'

  return (
    <div className={cn('grid grid-cols-1 gap-6', columnClass, className)}>
      {children}
    </div>
  )
}
