'use client'

import { Reply } from 'lucide-react'
import type { CommMessage } from '@/lib/communication-types'
import { renderMessageBody } from '@/components/messages/MentionChip'
import { ReactionBar } from '@/components/messages/ReactionBar'
import { AttachmentViewer } from '@/components/messages/AttachmentViewer'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function replySnippet(message: CommMessage['reply_to']): string {
  if (!message) return ''
  if (message.deleted_at) return 'This message was deleted'
  const text = message.body_text?.trim() || 'Attachment'
  return text.length > 80 ? `${text.slice(0, 79)}…` : text
}

export function MessageBubble({
  message,
  currentUserId,
  isOwn,
  onReply,
  onReact,
  onJumpToReply,
}: {
  message: CommMessage
  currentUserId?: string | null
  isOwn: boolean
  onReply: (m: CommMessage) => void
  onReact: (m: CommMessage, emoji: string) => void
  onJumpToReply?: (messageId: string) => void
}) {
  const deleted = !!message.deleted_at
  const senderName = message.sender?.display_name ?? 'Unknown'
  const hasReactions = (message.reactions?.length ?? 0) > 0

  const actions = !deleted ? (
    <div
      className={cn(
        'flex shrink-0 items-center gap-1 self-center',
        !hasReactions && 'opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100',
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 rounded-full border bg-background shadow-sm"
        title="Reply"
        onClick={() => onReply(message)}
      >
        <Reply className="h-3.5 w-3.5" />
      </Button>
      <ReactionBar
        reactions={message.reactions ?? []}
        currentUserId={currentUserId}
        onToggle={(emoji) => onReact(message, emoji)}
        pickerSide={isOwn ? 'left' : 'right'}
      />
    </div>
  ) : null

  return (
    <div
      id={`msg-${message.id}`}
      data-message-id={message.id}
      className={cn('group flex w-full px-1 py-1', isOwn ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'flex max-w-[70%] items-start gap-1.5',
          isOwn ? 'flex-row-reverse' : 'flex-row',
        )}
      >
        {/* Bubble */}
        <div
          className={cn(
            'relative min-w-0 rounded-2xl px-3 py-2 text-left shadow-sm',
            isOwn
              ? 'rounded-br-md bg-emerald-100 text-emerald-950 dark:bg-emerald-900/40 dark:text-emerald-50'
              : 'rounded-bl-md bg-muted text-foreground',
          )}
        >
          {!isOwn ? (
            <div className="mb-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
              {senderName}
            </div>
          ) : null}

          {message.reply_to ? (
            <button
              type="button"
              onClick={() => {
                if (message.reply_to_id) onJumpToReply?.(message.reply_to_id)
              }}
              className={cn(
                'mb-1.5 w-full rounded-md border-l-4 px-2 py-1.5 text-left text-xs',
                isOwn
                  ? 'border-emerald-500 bg-emerald-200/60 text-emerald-900 dark:bg-black/20 dark:text-emerald-100'
                  : 'border-emerald-500 bg-black/5 text-muted-foreground dark:bg-white/5',
              )}
            >
              <div className="font-semibold text-emerald-700 dark:text-emerald-400">
                {message.reply_to.sender?.display_name ?? 'Message'}
              </div>
              <div className="line-clamp-2 opacity-90">{replySnippet(message.reply_to)}</div>
            </button>
          ) : null}

          <div className="whitespace-pre-wrap break-words text-left text-sm leading-relaxed">
            {deleted ? (
              <span className="italic text-muted-foreground">This message was deleted</span>
            ) : (
              renderMessageBody(message.body_text, message.mentions ?? [])
            )}
          </div>

          {!deleted && message.attachments?.length > 0 ? (
            <div className="mt-2 flex flex-col gap-2">
              {message.attachments.map((a) => (
                <AttachmentViewer key={a.id} attachment={a} />
              ))}
            </div>
          ) : null}

          <div
            className={cn(
              'mt-1 flex items-center justify-end gap-1 text-[10px]',
              isOwn ? 'text-emerald-800/70 dark:text-emerald-200/70' : 'text-muted-foreground',
            )}
          >
            {message.edited_at ? <span>edited</span> : null}
            <span>{formatTime(message.created_at)}</span>
          </div>
        </div>

        {/* Reply + reactions sit beside the bubble — left for own, right for others */}
        {actions}
      </div>
    </div>
  )
}
