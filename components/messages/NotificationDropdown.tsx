'use client'

import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UnreadBadge } from '@/components/messages/UnreadBadge'
import {
  listNotifications,
  markNotificationsRead,
} from '@/lib/communication-api'
import type { CommNotification } from '@/lib/communication-types'

export function NotificationDropdown({
  onOpenConversation,
}: {
  onOpenConversation: (conversationId: string) => void
}) {
  const [items, setItems] = useState<CommNotification[]>([])
  const [unread, setUnread] = useState(0)

  const refresh = async () => {
    try {
      const res = await listNotifications()
      setItems(res.data)
      setUnread(res.unread_count)
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    void refresh()
    const t = setInterval(() => void refresh(), 30000)
    return () => clearInterval(t)
  }, [])

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) void refresh()
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          <UnreadBadge count={unread} className="absolute -right-0.5 -top-0.5 h-4 min-w-4 px-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          Notifications
          {unread > 0 ? (
            <button
              type="button"
              className="text-xs font-normal text-muted-foreground hover:text-foreground"
              onClick={() => {
                void markNotificationsRead().then(refresh)
              }}
            >
              Mark all read
            </button>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="px-2 py-6 text-center text-xs text-muted-foreground">No notifications</div>
        ) : (
          items.slice(0, 20).map((n) => (
            <DropdownMenuItem
              key={n.id}
              className="flex flex-col items-start gap-0.5 py-2"
              onClick={() => {
                if (n.conversation_id) onOpenConversation(n.conversation_id)
                if (!n.read_at) void markNotificationsRead([n.id]).then(refresh)
              }}
            >
              <span className={n.read_at ? 'text-sm' : 'text-sm font-semibold'}>{n.title}</span>
              {n.body ? (
                <span className="line-clamp-2 text-xs text-muted-foreground">{n.body}</span>
              ) : null}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
