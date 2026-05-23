'use client'

import { Search, Sun, Moon, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AssistantTrigger } from '@/components/assistant/AssistantPanel'

export function AppTopBar({
  mounted,
  resolvedTheme,
  setTheme,
  assistantOpen,
  onToggleAssistant,
  userLabel,
  onLogout,
}: {
  mounted: boolean
  resolvedTheme: string | undefined
  setTheme: (theme: string) => void
  assistantOpen: boolean
  onToggleAssistant: () => void
  userLabel: string
  onLogout: () => void
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-[#151922] bg-[#1c2130] px-4 text-slate-200">
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-lg font-semibold tracking-tight text-white">LEJER</span>
        <span className="hidden text-xs text-slate-400 sm:inline">ERP</span>
      </div>

      <div className="relative mx-auto hidden max-w-md flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
        <Input
          readOnly
          placeholder="Search in LEJER (/)"
          className="h-9 rounded-full border-0 bg-[#0f131a] pl-9 text-sm text-slate-200 placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-[#3b82f6]"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-500 sm:inline">
          /
        </kbd>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
        <AssistantTrigger active={assistantOpen} onClick={onToggleAssistant} />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-slate-300 hover:bg-white/10 hover:text-white"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
        >
          {mounted && resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </Button>
        {userLabel ? (
          <span className="hidden max-w-[140px] truncate text-sm text-slate-300 lg:inline">
            {userLabel}
          </span>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-slate-300 hover:bg-white/10 hover:text-white"
          onClick={onLogout}
          aria-label="Log out"
        >
          <LogOut size={18} />
        </Button>
      </div>
    </header>
  )
}
