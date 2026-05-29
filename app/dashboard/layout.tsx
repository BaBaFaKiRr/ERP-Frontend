'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AppTopBar } from '@/components/layout/app-topbar'
import { AssistantPanel } from '@/components/assistant/AssistantPanel'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import { OnboardingBanner } from '@/components/dashboard/onboarding-banner'
import { OrganizationProvider, useOrganization } from '@/lib/organization-context'
import type { MeResponse } from '@/lib/organization-store'
import { erpFetch } from '@/lib/erp-api'

const ASSISTANT_LAYOUT_LS_KEY = 'erp-assistant-panel-layout'

function readAssistantLayout(): number[] | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const raw = localStorage.getItem(ASSISTANT_LAYOUT_LS_KEY)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as unknown
    if (
      Array.isArray(parsed) &&
      parsed.length === 2 &&
      parsed.every((n) => typeof n === 'number' && n > 0)
    ) {
      return parsed as number[]
    }
  } catch {
    /* ignore */
  }
  return undefined
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [assistantLayout, setAssistantLayout] = useState<number[] | undefined>(undefined)
  const [mounted, setMounted] = useState(false)
  const [userLabel, setUserLabel] = useState('')
  const router = useRouter()
  const supabase = createClient()
  const { resolvedTheme, setTheme } = useTheme()
  const {
    organizations,
    currentOrganization,
    switchOrganization,
    loading: orgLoading,
  } = useOrganization()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    setAssistantLayout(readAssistantLayout())
  }, [mounted])

  useEffect(() => {
    if (!mounted) return
    void (async () => {
      try {
        const res = await erpFetch<MeResponse>('/api/me')
        const u = res.user
        const name = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim()
        setUserLabel(name || u.email)
      } catch {
        setUserLabel('')
      }
    })()
  }, [mounted])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const topBarProps = {
    mounted,
    resolvedTheme,
    setTheme,
    userLabel,
    onLogout: () => void handleLogout(),
    organizations,
    currentOrganization,
    onSwitchOrganization: (id: string) => void switchOrganization(id),
  }

  if (orgLoading) {
    return (
      <div className="dashboard-shell flex h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading workspace…</p>
      </div>
    )
  }

  const mainCanvas = (
    <div className="erp-main-canvas flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <AppTopBar
        {...topBarProps}
        assistantOpen={assistantOpen}
        onToggleAssistant={() => setAssistantOpen((o) => !o)}
      />
      <OnboardingBanner />
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </div>
  )

  return (
    <div
      className={cn(
        'dashboard-shell flex h-screen overflow-hidden',
        mounted && resolvedTheme === 'dark' && 'dashboard-colorful-accents',
      )}
    >
      <AppSidebar />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {assistantOpen ? (
          <ResizablePanelGroup
            direction="horizontal"
            className="h-full min-h-0"
            onLayout={(sizes) => {
              if (sizes.length === 2) {
                setAssistantLayout(sizes)
                localStorage.setItem(ASSISTANT_LAYOUT_LS_KEY, JSON.stringify(sizes))
              }
            }}
          >
            <ResizablePanel
              id="dashboard-main"
              order={1}
              defaultSize={assistantLayout?.[0] ?? 72}
              minSize={35}
              className="min-w-0"
            >
              {mainCanvas}
            </ResizablePanel>
            <ResizableHandle withHandle className="bg-border/80" />
            <ResizablePanel
              id="dashboard-assistant"
              order={2}
              defaultSize={assistantLayout?.[1] ?? 28}
              minSize={18}
              maxSize={55}
              className="min-w-0"
            >
              <AssistantPanel onClose={() => setAssistantOpen(false)} />
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          mainCanvas
        )}
      </div>
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <OrganizationProvider>
      <DashboardShell>{children}</DashboardShell>
    </OrganizationProvider>
  )
}
