'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type SettingsSplitLayoutProps = {
  editor: ReactNode
  list: ReactNode
  className?: string
  listSticky?: boolean
}

export function SettingsSplitLayout({
  editor,
  list,
  className,
  listSticky = true,
}: SettingsSplitLayoutProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 items-start gap-6 lg:grid-cols-12',
        className,
      )}
    >
      <div className="min-w-0 lg:col-span-5 xl:col-span-5">{editor}</div>
      <div
        className={cn(
          'min-w-0 lg:col-span-7 xl:col-span-7',
          listSticky && 'lg:sticky lg:top-6',
        )}
      >
        {list}
      </div>
    </div>
  )
}

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
