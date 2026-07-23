'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CommMessage, Conversation } from '@/lib/communication-types'
import {
  listMessages,
  markRead,
  sendMessage,
  sendTyping,
  toggleReaction,
} from '@/lib/communication-api'
import { ConversationHeader } from '@/components/messages/ConversationHeader'
import { MessageBubble } from '@/components/messages/MessageBubble'
import { MessageComposer } from '@/components/messages/MessageComposer'
import { TypingIndicator } from '@/components/messages/TypingIndicator'
import { Button } from '@/components/ui/button'

export function MessageThread({
  conversation,
  currentUserId,
  onMessageEvent,
  typingNames,
  compact,
  hideHeader,
}: {
  conversation: Conversation
  currentUserId?: string | null
  onMessageEvent?: () => void
  typingNames?: string[]
  compact?: boolean
  hideHeader?: boolean
}) {
  const [messages, setMessages] = useState<CommMessage[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [replyTo, setReplyTo] = useState<CommMessage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onMessageEventRef = useRef(onMessageEvent)
  const conversationIdRef = useRef(conversation.id)
  const stickToBottomRef = useRef(true)

  useEffect(() => {
    onMessageEventRef.current = onMessageEvent
  }, [onMessageEvent])

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    requestAnimationFrame(() => {
      const el = scrollerRef.current
      if (el) {
        el.scrollTo({ top: el.scrollHeight, behavior })
      } else {
        bottomRef.current?.scrollIntoView({ behavior })
      }
    })
  }, [])

  const handleScroll = () => {
    const el = scrollerRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    stickToBottomRef.current = distanceFromBottom < 80
  }

  const fetchMessages = useCallback(
    async (opts: { showLoading?: boolean; notifyParent?: boolean } = {}) => {
      const { showLoading = false, notifyParent = false } = opts
      if (showLoading) {
        setLoading(true)
        setError(null)
      }
      try {
        const data = await listMessages(conversation.id)
        if (conversationIdRef.current !== conversation.id) return
        setMessages(data.messages)
        setNextCursor(data.next_cursor)
        await markRead(conversation.id, data.messages.at(-1)?.id)
        if (notifyParent) onMessageEventRef.current?.()
        stickToBottomRef.current = true
        scrollToBottom('auto')
      } catch (e) {
        if (conversationIdRef.current !== conversation.id) return
        setError(e instanceof Error ? e.message : 'Failed to load messages')
      } finally {
        if (conversationIdRef.current === conversation.id) {
          setLoading(false)
        }
      }
    },
    [conversation.id, scrollToBottom],
  )

  useEffect(() => {
    conversationIdRef.current = conversation.id
    setMessages([])
    setNextCursor(null)
    setReplyTo(null)
    setError(null)
    setHighlightId(null)
    stickToBottomRef.current = true
    void fetchMessages({ showLoading: true, notifyParent: true })
  }, [conversation.id, fetchMessages])

  const appendRealtimeMessage = useCallback(
    (message: CommMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) {
          return prev.map((m) => (m.id === message.id ? message : m))
        }
        return [...prev, message]
      })
      if (stickToBottomRef.current || message.sender_id === currentUserId) {
        scrollToBottom()
      }
      void markRead(conversation.id, message.id)
      onMessageEventRef.current?.()
    },
    [conversation.id, currentUserId, scrollToBottom],
  )

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        conversationId?: string
        message?: CommMessage
        type?: string
      }
      if (detail.conversationId !== conversation.id) return
      if (detail.type === 'message.created' || detail.type === 'message.updated') {
        if (detail.message) appendRealtimeMessage(detail.message)
      }
      if (detail.type === 'message.deleted' && detail.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === detail.message!.id ? { ...m, ...detail.message! } : m)),
        )
      }
      if (detail.type === 'reaction.added' || detail.type === 'reaction.removed') {
        void fetchMessages({ showLoading: false })
      }
    }
    window.addEventListener('lejer-comm-event', handler)
    return () => {
      window.removeEventListener('lejer-comm-event', handler)
    }
  }, [appendRealtimeMessage, conversation.id, fetchMessages])

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return
    const el = scrollerRef.current
    const prevHeight = el?.scrollHeight ?? 0
    setLoadingMore(true)
    try {
      const data = await listMessages(conversation.id, nextCursor)
      setMessages((prev) => [...data.messages, ...prev])
      setNextCursor(data.next_cursor)
      requestAnimationFrame(() => {
        if (!el) return
        el.scrollTop = el.scrollHeight - prevHeight
      })
    } finally {
      setLoadingMore(false)
    }
  }

  const handleReply = (m: CommMessage) => {
    setReplyTo(m)
  }

  const jumpToReply = (messageId: string) => {
    const target = document.getElementById(`msg-${messageId}`)
    if (!target) return
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setHighlightId(messageId)
    window.setTimeout(() => setHighlightId((id) => (id === messageId ? null : id)), 1600)
  }

  const onSend = async (payload: {
    body_text: string
    mentions: Array<{ type: string; id: string; display: string; object_type?: string }>
    attachments: Array<{
      file_name: string
      file_type: string | null
      mime_type: string | null
      file_size: number
      storage_path: string
    }>
    reply_to_id?: string | null
  }) => {
    const msg = await sendMessage(conversation.id, payload)
    setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]))
    setReplyTo(null)
    stickToBottomRef.current = true
    scrollToBottom()
    onMessageEventRef.current?.()
    void sendTyping(conversation.id, false)
  }

  const notifyTyping = () => {
    void sendTyping(conversation.id, true)
    if (typingTimer.current) clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => {
      void sendTyping(conversation.id, false)
    }, 2000)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {!hideHeader ? <ConversationHeader conversation={conversation} /> : null}

      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        {/* mt-auto stacks messages from the bottom when the thread is short */}
        <div className="flex min-h-full flex-col">
          <div className="mt-auto flex flex-col gap-1 px-1 py-3">
            {nextCursor ? (
              <div className="flex justify-center py-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={loadingMore}
                  onClick={() => void loadMore()}
                >
                  {loadingMore ? 'Loading…' : 'Load earlier messages'}
                </Button>
              </div>
            ) : null}

            {loading && messages.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                Loading messages…
              </div>
            ) : error && messages.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-destructive">{error}</div>
            ) : messages.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No messages yet. Start the conversation.
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={
                    highlightId === m.id
                      ? 'rounded-lg bg-amber-200/40 transition-colors dark:bg-amber-500/20'
                      : undefined
                  }
                >
                  <MessageBubble
                    message={m}
                    currentUserId={currentUserId}
                    isOwn={m.sender_id === currentUserId}
                    onReply={handleReply}
                    onJumpToReply={jumpToReply}
                    onReact={async (msg, emoji) => {
                      await toggleReaction(msg.id, emoji)
                      void fetchMessages({ showLoading: false })
                    }}
                  />
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>
        </div>
      </div>

      <TypingIndicator names={typingNames ?? []} />

      <div onKeyDown={notifyTyping}>
        <MessageComposer
          conversationId={conversation.id}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          onSend={onSend}
          compact={compact}
        />
      </div>
    </div>
  )
}
