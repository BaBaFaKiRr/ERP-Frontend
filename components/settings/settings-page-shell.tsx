'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type SettingsPageShellProps = {
  title: string
  description: string
  backLink?: { href: string; label: string }
  status?: ReactNode
  children: ReactNode
  className?: string
}

export function SettingsPageShell({
  title,
  description,
  backLink,
  status,
  children,
  className,
}: SettingsPageShellProps) {
  return (
    <div className={cn('mx-auto w-full max-w-[1400px] p-6 md:p-8', className)}>
      {backLink ? (
        <Link
          href={backLink.href}
          className="mb-4 inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="mr-2 size-4" />
          {backLink.label}
        </Link>
      ) : null}

      <header className="mb-6 max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground md:text-base">{description}</p>
      </header>

      {status ? <div className="mb-6 space-y-2">{status}</div> : null}

      <div className="space-y-8">{children}</div>
    </div>
  )
}
