'use client'

import { Hash, Users } from 'lucide-react'
import type { Conversation } from '@/lib/communication-types'

export function ConversationHeader({ conversation }: { conversation: Conversation }) {
  const title =
    conversation.title || conversation.name || conversation.object_label || 'Conversation'
  const subtitle =
    conversation.type === 'direct'
      ? conversation.other_user?.email ?? 'Direct message'
      : conversation.type === 'channel'
        ? `${conversation.visibility} channel · ${conversation.members?.length ?? 0} members`
        : conversation.type === 'group'
          ? `Group · ${conversation.members?.length ?? 0} members`
          : conversation.object_type
            ? `${conversation.object_type.replace(/_/g, ' ')} discussion`
            : conversation.description

  return (
    <div className="flex h-14 shrink-0 items-center gap-3 border-b px-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1c2130] text-white">
        {conversation.type === 'channel' ? (
          <Hash className="h-4 w-4" />
        ) : conversation.type === 'group' ? (
          <Users className="h-4 w-4" />
        ) : (
          <span className="text-sm font-semibold">{title.slice(0, 1).toUpperCase()}</span>
        )}
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold">{title}</div>
        {subtitle ? (
          <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
        ) : null}
      </div>
    </div>
  )
}
