'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LEJER_LOGO_MARK_SRC } from '@/lib/branding'
import { MAIN_NAV, childActive, type NavItem } from '@/lib/dashboard-nav'
import { filterNavForPermissions } from '@/lib/nav-permissions'
import { useOrganization } from '@/lib/organization-context'
import { useCommunicationNotifications } from '@/lib/communication-notifications-context'
import { UnreadDot } from '@/components/messages/UnreadBadge'

function NavFlyout({
  item,
  open,
  onClose,
}: {
  item: NavItem
  open: boolean
  onClose: () => void
}) {
  const pathname = usePathname()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open, onClose])

  if (!open || !item.children?.length) return null

  const sectionPrefix = item.sectionPrefix ?? ''

  return (
    <div
      ref={ref}
      className="fixed bottom-0 left-[72px] top-14 z-50 flex w-56 flex-col border-r border-white/10 bg-[#1c2130] py-3 shadow-xl"
    >
      <p className="px-4 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
        {item.name}
      </p>
      <nav className="flex flex-col gap-0.5 px-2">
        {item.children.map((child) => {
          const active = childActive(pathname, child.href, sectionPrefix)
          return (
            <Link
              key={child.href}
              href={child.href}
              onClick={onClose}
              className={cn(
                'rounded-md px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-[#2563eb]/20 font-medium text-white'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white',
              )}
            >
              {child.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

export function AppSidebar() {
  const pathname = usePathname()
  const [flyout, setFlyout] = useState<string | null>(null)
  const { permissions, permissionBypass } = useOrganization()
  const { hasUnread } = useCommunicationNotifications()
  const navItems = filterNavForPermissions(MAIN_NAV, permissions, permissionBypass)

  return (
    <aside className="relative z-40 flex h-full w-[72px] shrink-0 flex-col border-r border-[#151922] bg-[#1c2130] text-slate-300">
      <div className="flex h-14 shrink-0 items-center justify-center border-b border-white/10">
        <Link href="/dashboard" aria-label="LEJER home" className="rounded-lg outline-offset-2">
          <Image
            src={LEJER_LOGO_MARK_SRC}
            alt=""
            width={32}
            height={32}
            className="object-contain"
            priority
          />
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden py-2 scrollbar-thin">
        {navItems.map((item) => {
          const active = item.match?.(pathname) ?? false
          const Icon = item.icon
          const hasChildren = Boolean(item.children?.length)

          if (hasChildren) {
            return (
              <div key={item.name} className="relative">
                <button
                  type="button"
                  onClick={() => setFlyout((f) => (f === item.name ? null : item.name))}
                  className={cn(
                    'group relative flex w-full flex-col items-center gap-1 px-1 py-2.5 text-[10px] leading-tight transition-colors',
                    active || flyout === item.name
                      ? 'text-white'
                      : 'text-slate-400 hover:text-slate-200',
                  )}
                  aria-expanded={flyout === item.name}
                >
                  {(active || flyout === item.name) && (
                    <span
                      className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r bg-[#3b82f6]"
                      aria-hidden
                    />
                  )}
                  <Icon size={22} strokeWidth={1.75} className="shrink-0" />
                  <span className="max-w-[64px] truncate text-center">{item.name}</span>
                </button>
                <NavFlyout
                  item={item}
                  open={flyout === item.name}
                  onClose={() => setFlyout(null)}
                />
              </div>
            )
          }

          return (
            <Link
              key={item.name}
              href={item.href!}
              className={cn(
                'group relative flex flex-col items-center gap-1 px-1 py-2.5 text-[10px] leading-tight transition-colors',
                active ? 'text-white' : 'text-slate-400 hover:text-slate-200',
              )}
            >
              {active && (
                <span
                  className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r bg-[#3b82f6]"
                  aria-hidden
                />
              )}
              <span className="relative">
                <Icon size={22} strokeWidth={1.75} className="shrink-0" />
                {item.name === 'Messages' ? (
                  <UnreadDot
                    show={hasUnread}
                    className="absolute -right-0.5 -top-0.5 ring-2 ring-[#1c2130]"
                    title="Unread messages"
                  />
                ) : null}
              </span>
              <span className="max-w-[64px] truncate text-center">{item.name}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
