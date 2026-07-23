'use client'

import { Hash, Lock, Users } from 'lucide-react'
import type { Conversation, ConversationType } from '@/lib/communication-types'
import { UnreadBadge } from '@/components/messages/UnreadBadge'
import { cn } from '@/lib/utils'

function iconFor(type: ConversationType) {
  if (type === 'channel') return Hash
  if (type === 'group') return Users
  if (type === 'object_thread') return Lock
  return null
}

function titleOf(c: Conversation) {
  return c.title || c.name || c.object_label || 'Conversation'
}

function previewOf(c: Conversation) {
  return c.last_message_preview || 'No messages yet'
}

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  emptyLabel,
}: {
  conversations: Conversation[]
  activeId: string | null
  onSelect: (id: string) => void
  emptyLabel?: string
}) {
  if (conversations.length === 0) {
    return (
      <div className="px-3 py-6 text-center text-xs text-muted-foreground">
        {emptyLabel ?? 'Nothing here yet'}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0.5 px-1">
      {conversations.map((c) => {
        const Icon = iconFor(c.type)
        const active = c.id === activeId
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            className={cn(
              'flex w-full items-start gap-2 rounded-md px-2.5 py-2 text-left transition-colors',
              active ? 'bg-accent' : 'hover:bg-muted/60',
            )}
          >
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1c2130] text-xs font-semibold text-white">
              {Icon ? (
                <Icon className="h-3.5 w-3.5" />
              ) : (
                titleOf(c).slice(0, 1).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium">{titleOf(c)}</span>
                <UnreadBadge count={c.unread_count} className="ml-auto" />
              </div>
              <div className="truncate text-xs text-muted-foreground">{previewOf(c)}</div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
