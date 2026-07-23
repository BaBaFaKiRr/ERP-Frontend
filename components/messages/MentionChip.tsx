'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { OBJECT_HREF, type MessageMention } from '@/lib/communication-types'
import { cn } from '@/lib/utils'

export function MentionChip({
  mention,
  className,
}: {
  mention: Pick<MessageMention, 'mention_type' | 'mention_id' | 'display' | 'object_type'>
  className?: string
}) {
  const isUser = mention.mention_type === 'user'
  const objectType = mention.object_type ?? undefined
  const href =
    !isUser && objectType && OBJECT_HREF[objectType]
      ? OBJECT_HREF[objectType](mention.mention_id)
      : null

  const chip = (
    <span
      className={cn(
        'inline-flex items-center rounded px-1 py-0.5 text-[0.85em] font-medium',
        isUser
          ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
          : 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
        href && 'hover:underline cursor-pointer',
        className,
      )}
      title={isUser ? mention.display : `${objectType}: ${mention.display}`}
    >
      {isUser ? `@${mention.display}` : `#${mention.display}`}
    </span>
  )

  if (href) return <Link href={href}>{chip}</Link>
  return chip
}

/** Render body text replacing mention markers `@[display](user:id)` / `#[display](type:id)`. */
export function renderMessageBody(text: string, mentions: MessageMention[]) {
  if (!text) return null
  const pattern = /(@|\#)\[([^\]]+)\]\(([^:]+):([0-9a-f-]{36})\)/gi
  const parts: ReactNode[] = []
  let last = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(<span key={key++}>{text.slice(last, match.index)}</span>)
    }
    const kind = match[1]
    const display = match[2]
    const typeOrUser = match[3]
    const id = match[4]
    const fromDb = mentions.find((m) => m.mention_id === id)
    parts.push(
      <MentionChip
        key={key++}
        mention={{
          mention_type: kind === '@' || typeOrUser === 'user' ? 'user' : 'object',
          mention_id: id,
          display: fromDb?.display ?? display,
          object_type: kind === '#' ? typeOrUser : fromDb?.object_type ?? null,
        }}
      />,
    )
    last = match.index + match[0].length
  }

  if (last < text.length) parts.push(<span key={key++}>{text.slice(last)}</span>)
  return parts.length > 0 ? parts : text
}
