'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ImperativePanelHandle } from 'react-resizable-panels'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from 'next-themes'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AppTopBar } from '@/components/layout/app-topbar'
import { AssistantPanel } from '@/components/assistant/AssistantPanel'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import { OnboardingBanner } from '@/components/dashboard/onboarding-banner'
import { clearCachedAccessToken } from '@/lib/erp-api'
import { OrganizationProvider, useOrganization } from '@/lib/organization-context'

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
  const assistantPanelRef = useRef<ImperativePanelHandle>(null)
  const router = useRouter()
  const supabase = createClient()
  const { resolvedTheme, setTheme } = useTheme()
  const {
    me,
    organizations,
    currentOrganization,
    switchOrganization,
    loading: orgLoading,
  } = useOrganization()

  const userLabel = useMemo(() => {
    if (!me?.user) return ''
    const name = `${me.user.firstName ?? ''} ${me.user.lastName ?? ''}`.trim()
    return name || me.user.email
  }, [me])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    setAssistantLayout(readAssistantLayout())
  }, [mounted])

  useEffect(() => {
    if (!mounted) return
    const panel = assistantPanelRef.current
    if (!panel) return
    if (assistantOpen) {
      if (panel.isCollapsed()) {
        panel.expand(assistantLayout?.[1] ?? 28)
      }
    } else if (!panel.isCollapsed()) {
      panel.collapse()
    }
  }, [assistantOpen, mounted, assistantLayout])

  const handleLogout = async () => {
    clearCachedAccessToken()
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

  return (
    <div className="dashboard-shell flex h-screen overflow-hidden">
      <AppSidebar />

      <div className="erp-main-canvas flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <AppTopBar
          {...topBarProps}
          assistantOpen={assistantOpen}
          onToggleAssistant={() => setAssistantOpen((o) => !o)}
        />
        <OnboardingBanner />

        <ResizablePanelGroup
          direction="horizontal"
          className="min-h-0 flex-1"
          onLayout={(sizes) => {
            if (!assistantOpen || sizes.length !== 2) return
            setAssistantLayout(sizes)
            localStorage.setItem(ASSISTANT_LAYOUT_LS_KEY, JSON.stringify(sizes))
          }}
        >
          <ResizablePanel
            id="dashboard-main"
            order={1}
            defaultSize={assistantOpen ? (assistantLayout?.[0] ?? 72) : 100}
            minSize={35}
            className="flex min-h-0 min-w-0 flex-col"
          >
            <div className="min-h-0 flex-1 overflow-auto">{children}</div>
          </ResizablePanel>

          <ResizableHandle
            withHandle
            className={assistantOpen ? 'bg-border/80' : 'pointer-events-none w-0 opacity-0'}
          />

          <ResizablePanel
            ref={assistantPanelRef}
            id="dashboard-assistant"
            order={2}
            collapsible
            defaultSize={0}
            minSize={18}
            maxSize={55}
            collapsedSize={0}
            className="flex min-h-0 min-w-0 flex-col"
          >
            {assistantOpen ? (
              <AssistantPanel onClose={() => setAssistantOpen(false)} />
            ) : null}
          </ResizablePanel>
        </ResizablePanelGroup>
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
