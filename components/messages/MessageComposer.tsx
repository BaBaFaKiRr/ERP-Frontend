'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Paperclip, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { MentionPicker, type MentionOption } from '@/components/messages/MentionPicker'
import { listOrgChatMembers, searchObjects, uploadAttachment } from '@/lib/communication-api'
import type { CommMessage, MentionPayload } from '@/lib/communication-types'

type PendingFile = {
  file_name: string
  file_type: string | null
  mime_type: string | null
  file_size: number
  storage_path: string
}

function extractTrigger(text: string, caret: number): { mode: 'user' | 'object'; query: string; start: number } | null {
  const before = text.slice(0, caret)
  const match = /(?:^|\s)([@#])([^\s@#]*)$/.exec(before)
  if (!match) return null
  return {
    mode: match[1] === '@' ? 'user' : 'object',
    query: match[2] ?? '',
    start: caret - (match[2]?.length ?? 0) - 1,
  }
}

export function MessageComposer({
  conversationId,
  replyTo,
  onCancelReply,
  onSend,
  compact,
}: {
  conversationId: string
  replyTo?: CommMessage | null
  onCancelReply?: () => void
  onSend: (payload: {
    body_text: string
    mentions: MentionPayload[]
    attachments: PendingFile[]
    reply_to_id?: string | null
  }) => Promise<void>
  compact?: boolean
}) {
  const [text, setText] = useState('')
  const [mentions, setMentions] = useState<MentionPayload[]>([])
  const [attachments, setAttachments] = useState<PendingFile[]>([])
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [members, setMembers] = useState<MentionOption[]>([])
  const [objectOpts, setObjectOpts] = useState<MentionOption[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerMode, setPickerMode] = useState<'user' | 'object'>('user')
  const [activeIndex, setActiveIndex] = useState(0)
  const [triggerStart, setTriggerStart] = useState(0)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void listOrgChatMembers()
      .then((rows) =>
        setMembers(
          rows.map((u) => ({
            id: u.id,
            label: u.display_name,
            sublabel: u.email ?? undefined,
            type: 'user',
          })),
        ),
      )
      .catch(() => setMembers([]))
  }, [])

  const options = pickerMode === 'user' ? members : objectOpts

  const filtered = useMemo(() => {
    if (pickerMode !== 'user') return options
    const trigger = extractTrigger(text, taRef.current?.selectionStart ?? text.length)
    const q = (trigger?.query ?? '').toLowerCase()
    if (!q) return options.slice(0, 20)
    return options.filter((o) => o.label.toLowerCase().includes(q)).slice(0, 20)
  }, [options, pickerMode, text])

  const refreshTrigger = useCallback(async () => {
    const el = taRef.current
    if (!el) return
    const trigger = extractTrigger(text, el.selectionStart)
    if (!trigger) {
      setPickerOpen(false)
      return
    }
    setPickerMode(trigger.mode)
    setTriggerStart(trigger.start)
    setPickerOpen(true)
    setActiveIndex(0)
    if (trigger.mode === 'object') {
      const rows = await searchObjects(trigger.query)
      setObjectOpts(
        rows.map((r) => ({
          id: r.id,
          label: r.display,
          sublabel: r.type.replace(/_/g, ' '),
          type: r.type,
          object_type: r.type,
        })),
      )
    }
  }, [text])

  useEffect(() => {
    const t = setTimeout(() => {
      void refreshTrigger()
    }, 120)
    return () => clearTimeout(t)
  }, [text, refreshTrigger])

  const insertMention = (opt: MentionOption) => {
    const el = taRef.current
    if (!el) return
    const caret = el.selectionStart
    const trigger = extractTrigger(text, caret)
    if (!trigger) return
    const marker =
      opt.type === 'user'
        ? `@[${opt.label}](user:${opt.id})`
        : `#[${opt.label}](${opt.object_type ?? opt.type}:${opt.id})`
    const next = text.slice(0, trigger.start) + marker + ' ' + text.slice(caret)
    setText(next)
    setMentions((prev) => [
      ...prev.filter((m) => m.id !== opt.id),
      {
        type: opt.type === 'user' ? 'user' : (opt.object_type ?? opt.type),
        id: opt.id,
        display: opt.label,
        object_type: opt.type === 'user' ? undefined : opt.object_type ?? opt.type,
      },
    ])
    setPickerOpen(false)
    requestAnimationFrame(() => {
      const pos = trigger.start + marker.length + 1
      el.focus()
      el.setSelectionRange(pos, pos)
    })
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (pickerOpen && filtered.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => (i + 1) % filtered.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        insertMention(filtered[activeIndex]!)
        return
      }
      if (e.key === 'Escape') {
        setPickerOpen(false)
        return
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void submit()
    }
  }

  const submit = async () => {
    if (sending || uploading) return
    if (!text.trim() && attachments.length === 0) return
    setSending(true)
    try {
      await onSend({
        body_text: text.trim(),
        mentions,
        attachments,
        reply_to_id: replyTo?.id ?? null,
      })
      setText('')
      setMentions([])
      setAttachments([])
      onCancelReply?.()
    } finally {
      setSending(false)
    }
  }

  const onFile = async (file: File) => {
    setUploading(true)
    try {
      const meta = await uploadAttachment(file, conversationId)
      setAttachments((prev) => [...prev, meta])
    } finally {
      setUploading(false)
    }
  }

  // Focus composer when starting a reply
  useEffect(() => {
    if (replyTo) {
      requestAnimationFrame(() => taRef.current?.focus())
    }
  }, [replyTo])

  return (
    <div className={compact ? 'border-t bg-background px-2 py-3' : 'border-t bg-background px-2 py-4'}>
      {replyTo ? (
        <div className="mb-2 flex items-stretch overflow-hidden rounded-lg border bg-muted/40">
          <div className="w-1 shrink-0 bg-emerald-500" />
          <div className="min-w-0 flex-1 px-3 py-2">
            <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              Replying to {replyTo.sender?.display_name ?? 'message'}
            </div>
            <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {replyTo.deleted_at
                ? 'This message was deleted'
                : replyTo.body_text?.trim() || 'Attachment'}
            </div>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="px-3 text-muted-foreground hover:text-foreground"
            aria-label="Cancel reply"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {attachments.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((a) => (
            <div
              key={a.storage_path}
              className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
            >
              {a.file_name}
              <button
                type="button"
                onClick={() =>
                  setAttachments((prev) => prev.filter((x) => x.storage_path !== a.storage_path))
                }
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="relative">
        <MentionPicker
          open={pickerOpen}
          options={filtered}
          activeIndex={activeIndex}
          onSelect={insertMention}
          onHover={setActiveIndex}
          mode={pickerMode}
        />
        <Textarea
          ref={taRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message… Use @ for people, # for ERP records"
          className="min-h-[72px] resize-none pr-24"
          rows={compact ? 2 : 3}
        />
        <div className="absolute bottom-2 right-2 flex items-center gap-1">
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void onFile(f)
              e.target.value = ''
            }}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            className="h-8 w-8"
            disabled={sending || uploading || (!text.trim() && attachments.length === 0)}
            onClick={() => void submit()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Enter to send · Shift+Enter for newline · @ people · # records
      </p>
    </div>
  )
}
