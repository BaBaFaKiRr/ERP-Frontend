'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Package2,
  Factory,
  Truck,
  DollarSign,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Sun,
  Moon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'

const INVENTORY_CHILDREN = [
  { name: 'Items', href: '/dashboard/inventory/items' },
  { name: 'BOM', href: '/dashboard/inventory/bom' },
  { name: 'Stock', href: '/dashboard/inventory' },
  { name: 'Stock entries', href: '/dashboard/inventory/stock-entries' },
  { name: 'Scrap', href: '/dashboard/inventory/scrap' },
  { name: 'Material Issue Requests', href: '/dashboard/inventory/material-issue-requests' },
  { name: 'Deposit Requests', href: '/dashboard/inventory/deposit-requests' },
] as const

const MANUFACTURING_CHILDREN = [
  { name: 'Production', href: '/dashboard/manufacturing/production' },
  { name: 'Sales Orders', href: '/dashboard/manufacturing' },
  { name: 'Planning', href: '/dashboard/manufacturing/planning' },
  { name: 'Work Orders', href: '/dashboard/manufacturing/work-orders' },
] as const

function inventoryChildActive(pathname: string, href: (typeof INVENTORY_CHILDREN)[number]['href']) {
  if (href === '/dashboard/inventory') {
    return pathname === '/dashboard/inventory'
  }
  if (href === '/dashboard/inventory/items') {
    return pathname.startsWith('/dashboard/inventory/items')
  }
  if (href === '/dashboard/inventory/bom') {
    return pathname.startsWith('/dashboard/inventory/bom')
  }
  if (href === '/dashboard/inventory/stock-entries') {
    return pathname.startsWith('/dashboard/inventory/stock-entries')
  }
  if (href === '/dashboard/inventory/scrap') {
    return pathname.startsWith('/dashboard/inventory/scrap')
  }
  if (href === '/dashboard/inventory/material-issue-requests') {
    return pathname.startsWith('/dashboard/inventory/material-issue-requests')
  }
  if (href === '/dashboard/inventory/deposit-requests') {
    return pathname.startsWith('/dashboard/inventory/deposit-requests')
  }
  return pathname === '/dashboard/inventory'
}

const navigationAfterInventory = [
  { name: 'Sales Orders', href: '/dashboard/sales', icon: ShoppingCart },
  { name: 'Purchase Orders', href: '/dashboard/purchase', icon: Package2 },
  { name: 'Dispatch', href: '/dashboard/dispatch', icon: Truck },
  { name: 'Finance', href: '/dashboard/finance', icon: DollarSign },
  { name: 'HR & Employees', href: '/dashboard/hr', icon: Users },
  { name: 'Admin', href: '/dashboard/admin', icon: Settings },
]

function InventorySidebarSection({ sidebarOpen }: { sidebarOpen: boolean }) {
  const pathname = usePathname()
  const underInventory = pathname.startsWith('/dashboard/inventory')
  const [expanded, setExpanded] = useState(underInventory)

  useEffect(() => {
    if (underInventory) setExpanded(true)
  }, [underInventory])

  if (!sidebarOpen) {
    return (
      <Link
        href="/dashboard/inventory/items"
        className={cn(
          'text-app-nav-text-muted hover:text-app-nav-text flex items-center justify-center rounded-xl p-3 transition-colors hover:bg-slate-100 dark:hover:bg-white/10',
          underInventory && 'bg-slate-100 text-app-nav-text dark:bg-white/10',
        )}
        title="Inventory — Items"
      >
        <Package size={20} />
      </Link>
    )
  }

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className={cn(
          'text-app-nav-text-muted hover:text-app-nav-text flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-slate-100 dark:hover:bg-white/10',
          underInventory && 'bg-slate-100 text-app-nav-text dark:bg-white/10',
        )}
        aria-expanded={expanded}
      >
        <Package size={20} className="shrink-0" />
        <span className="flex-1 font-medium">Inventory</span>
        {expanded ? (
          <ChevronDown size={18} className="shrink-0 opacity-80" />
        ) : (
          <ChevronRight size={18} className="shrink-0 opacity-80" />
        )}
      </button>
      {expanded && (
        <div className="mt-1 space-y-1 border-l border-slate-200 ml-6 pl-2 mr-2 py-1 dark:border-white/15">
          {INVENTORY_CHILDREN.map((child) => {
            const active = inventoryChildActive(pathname, child.href)
            return (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  'block rounded-lg px-3 py-2 text-sm transition-colors',
                  active
                    ? 'bg-slate-100 text-app-nav-text font-medium dark:bg-white/10'
                    : 'text-app-nav-text-muted hover:text-app-nav-text hover:bg-slate-100 dark:hover:bg-white/10',
                )}
              >
                {child.name}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function manufacturingChildActive(
  pathname: string,
  href: (typeof MANUFACTURING_CHILDREN)[number]['href'],
) {
  if (href === '/dashboard/manufacturing/production') {
    return pathname.startsWith('/dashboard/manufacturing/production')
  }
  if (href === '/dashboard/manufacturing') {
    return pathname === '/dashboard/manufacturing'
  }
  if (href === '/dashboard/manufacturing/planning') {
    return pathname.startsWith('/dashboard/manufacturing/planning')
  }
  return pathname.startsWith('/dashboard/manufacturing/work-orders')
}

function ManufacturingSidebarSection({ sidebarOpen }: { sidebarOpen: boolean }) {
  const pathname = usePathname()
  const underManufacturing = pathname.startsWith('/dashboard/manufacturing')
  const [expanded, setExpanded] = useState(underManufacturing)

  useEffect(() => {
    if (underManufacturing) setExpanded(true)
  }, [underManufacturing])

  if (!sidebarOpen) {
    return (
      <Link
        href="/dashboard/manufacturing"
        className={cn(
          'text-app-nav-text-muted hover:text-app-nav-text flex items-center justify-center rounded-xl p-3 transition-colors hover:bg-slate-100 dark:hover:bg-white/10',
          underManufacturing && 'bg-slate-100 text-app-nav-text dark:bg-white/10',
        )}
        title="Manufacturing"
      >
        <Factory size={20} />
      </Link>
    )
  }

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className={cn(
          'text-app-nav-text-muted hover:text-app-nav-text flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-slate-100 dark:hover:bg-white/10',
          underManufacturing && 'bg-slate-100 text-app-nav-text dark:bg-white/10',
        )}
        aria-expanded={expanded}
      >
        <Factory size={20} className="shrink-0" />
        <span className="flex-1 font-medium">Manufacturing</span>
        {expanded ? (
          <ChevronDown size={18} className="shrink-0 opacity-80" />
        ) : (
          <ChevronRight size={18} className="shrink-0 opacity-80" />
        )}
      </button>
      {expanded && (
        <div className="mt-1 space-y-1 border-l border-slate-200 ml-6 pl-2 mr-2 py-1 dark:border-white/15">
          {MANUFACTURING_CHILDREN.map((child) => {
            const active = manufacturingChildActive(pathname, child.href)
            return (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  'block rounded-lg px-3 py-2 text-sm transition-colors',
                  active
                    ? 'bg-slate-100 text-app-nav-text font-medium dark:bg-white/10'
                    : 'text-app-nav-text-muted hover:text-app-nav-text hover:bg-slate-100 dark:hover:bg-white/10',
                )}
              >
                {child.name}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <div className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.2),_transparent_40%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.12),_transparent_35%)] bg-background p-3">
      <div className="flex h-full gap-3">
      <aside
        className={cn(
          sidebarOpen ? 'w-72' : 'w-20',
          'flex h-full shrink-0 flex-col rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.35)] backdrop-blur-xl transition-all duration-300 dark:border-white/10 dark:bg-[#0b1020]/85 dark:text-white dark:shadow-[0_24px_80px_-32px_rgba(15,23,42,0.9)]',
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-white/10">
          {sidebarOpen && (
            <div>
              <p className="text-app-nav-text-soft text-xs uppercase tracking-[0.22em]">
                ERP Workspace
              </p>
              <h1 className="text-lg font-semibold">Core Operations</h1>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-app-nav-text-soft hover:text-app-nav-text rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-white/10"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <Link
            href="/dashboard"
            className={cn(
              'text-app-nav-text-muted hover:text-app-nav-text flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-100 dark:hover:bg-white/10',
              pathname === '/dashboard' && 'bg-slate-100 text-app-nav-text dark:bg-white/10',
            )}
          >
            <LayoutDashboard size={20} />
            {sidebarOpen && <span>Dashboard</span>}
          </Link>

          <InventorySidebarSection sidebarOpen={sidebarOpen} />
          <ManufacturingSidebarSection sidebarOpen={sidebarOpen} />

          {navigationAfterInventory.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'text-app-nav-text-muted hover:text-app-nav-text flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-100 dark:hover:bg-white/10',
                pathname.startsWith(item.href) && 'bg-slate-100 text-app-nav-text dark:bg-white/10',
              )}
            >
              <item.icon size={20} />
              {sidebarOpen && <span>{item.name}</span>}
            </Link>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-3 dark:border-white/10">
          <Button
            onClick={handleLogout}
            variant="ghost"
            className={cn(
              'text-app-nav-text-muted hover:text-app-nav-text w-full justify-start rounded-xl hover:bg-slate-100 dark:hover:bg-white/10',
              !sidebarOpen && 'justify-center px-0',
            )}
          >
            <LogOut size={20} />
            {sidebarOpen && <span className="ml-2">Logout</span>}
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-hidden rounded-2xl border border-border/50 bg-background/75 backdrop-blur-xl">
        <header className="flex h-16 items-center justify-between border-b border-border/60 px-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Workspace</p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border-border/70 bg-background/60"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
          >
            {mounted && resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            <span>{mounted && resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          </Button>
        </header>
        <div className="h-[calc(100%-4rem)] overflow-auto">{children}</div>
      </main>
      </div>
    </div>
  )
}
