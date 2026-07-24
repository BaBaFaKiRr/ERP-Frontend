'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { listConversations, openRealtimeStream } from '@/lib/communication-api'
import { useOrganization } from '@/lib/organization-context'
import type { CommMessage } from '@/lib/communication-types'

type CommunicationNotificationsContextValue = {
  hasUnread: boolean
  totalUnread: number
  unreadByConversation: Record<string, number>
  activeConversationId: string | null
  setActiveConversationId: (id: string | null) => void
  refreshUnread: () => Promise<void>
}

const CommunicationNotificationsContext =
  createContext<CommunicationNotificationsContextValue | null>(null)

const NOTIF_PERM_ASKED_KEY = 'lejer-comm-notif-perm-asked'

function canUseNotifications(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

async function ensureNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!canUseNotifications()) return 'unsupported'
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission
  }
  try {
    if (sessionStorage.getItem(NOTIF_PERM_ASKED_KEY) === '1') {
      return Notification.permission
    }
    sessionStorage.setItem(NOTIF_PERM_ASKED_KEY, '1')
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

function showBrowserNotification(input: {
  title: string
  body: string
  conversationId?: string
  onClick?: () => void
}) {
  if (!canUseNotifications() || Notification.permission !== 'granted') return
  try {
    const n = new Notification(input.title, {
      body: input.body,
      tag: input.conversationId ? `lejer-comm-${input.conversationId}` : 'lejer-comm',
      renotify: true,
    })
    n.onclick = () => {
      window.focus()
      input.onClick?.()
      n.close()
    }
  } catch {
    /* ignore — some browsers block without user gesture */
  }
}

export function CommunicationNotificationsProvider({ children }: { children: ReactNode }) {
  const { me, currentOrganizationId, loading: orgLoading } = useOrganization()
  const pathname = usePathname()
  const router = useRouter()
  const [totalUnread, setTotalUnread] = useState(0)
  const [unreadByConversation, setUnreadByConversation] = useState<Record<string, number>>({})
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const activeConversationIdRef = useRef<string | null>(null)
  const userId = me?.user?.id ?? null

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId
  }, [activeConversationId])

  const refreshUnread = useCallback(async () => {
    if (!currentOrganizationId || !userId) {
      setTotalUnread(0)
      setUnreadByConversation({})
      return
    }
    try {
      const data = await listConversations()
      const map: Record<string, number> = {}
      let total = 0
      for (const c of data) {
        const count = c.unread_count ?? 0
        if (count > 0) {
          map[c.id] = count
          total += count
        }
      }
      setUnreadByConversation(map)
      setTotalUnread(total)
    } catch {
      /* ignore — e.g. no permission yet */
    }
  }, [currentOrganizationId, userId])

  useEffect(() => {
    if (orgLoading || !currentOrganizationId || !userId) return
    void refreshUnread()
    void ensureNotificationPermission()
  }, [orgLoading, currentOrganizationId, userId, refreshUnread])

  // Clear active conversation tracking when leaving messages
  useEffect(() => {
    if (!pathname.startsWith('/dashboard/messages')) {
      setActiveConversationId(null)
    }
  }, [pathname])

  useEffect(() => {
    if (orgLoading || !currentOrganizationId || !userId) return

    let close: (() => void) | undefined
    let cancelled = false
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    const connect = () => {
      void openRealtimeStream(
        (event) => {
          if (cancelled) return
          const type = String(event.type ?? '')
          const conversationId = event.conversationId as string | undefined
          const payload = (event.payload ?? {}) as Record<string, unknown>

          window.dispatchEvent(
            new CustomEvent('lejer-comm-event', {
              detail: {
                type,
                conversationId,
                message: payload.message,
                ...payload,
              },
            }),
          )

          if (
            type === 'message.created' ||
            type === 'message.read' ||
            type === 'conversation.updated' ||
            type === 'member.joined'
          ) {
            void refreshUnread()
          }

          if (type === 'message.created') {
            const message = payload.message as CommMessage | undefined
            if (!message || message.sender_id === userId) return

            const viewingThisChat =
              activeConversationIdRef.current === conversationId &&
              pathname.startsWith('/dashboard/messages')
            const tabFocused = typeof document !== 'undefined' && document.hasFocus()

            // Prompt whenever the user isn't actively looking at that chat
            if (!viewingThisChat || !tabFocused) {
              const senderName = message.sender?.display_name ?? 'New message'
              const body = (message.body_text || 'Sent an attachment').slice(0, 140)
              void ensureNotificationPermission().then((perm) => {
                if (perm !== 'granted') return
                showBrowserNotification({
                  title: senderName,
                  body,
                  conversationId,
                  onClick: () => {
                    const href = conversationId
                      ? `/dashboard/messages?c=${conversationId}`
                      : '/dashboard/messages'
                    router.push(href)
                  },
                })
              })
            }
          }
        },
        () => {
          if (cancelled) return
          reconnectTimer = setTimeout(connect, 4000)
        },
      ).then((fn) => {
        close = fn
      })
    }

    connect()

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void refreshUnread()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      close?.()
      if (reconnectTimer) clearTimeout(reconnectTimer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [orgLoading, currentOrganizationId, userId, refreshUnread, pathname, router])

  const value = useMemo(
    () => ({
      hasUnread: totalUnread > 0,
      totalUnread,
      unreadByConversation,
      activeConversationId,
      setActiveConversationId,
      refreshUnread,
    }),
    [totalUnread, unreadByConversation, activeConversationId, refreshUnread],
  )

  return (
    <CommunicationNotificationsContext.Provider value={value}>
      {children}
    </CommunicationNotificationsContext.Provider>
  )
}

export function useCommunicationNotifications(): CommunicationNotificationsContextValue {
  const ctx = useContext(CommunicationNotificationsContext)
  if (!ctx) {
    return {
      hasUnread: false,
      totalUnread: 0,
      unreadByConversation: {},
      activeConversationId: null,
      setActiveConversationId: () => {},
      refreshUnread: async () => {},
    }
  }
  return ctx
}
