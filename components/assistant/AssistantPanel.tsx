'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowUp, Bot, ChevronDown, Loader2, PanelRightClose, Sparkles, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { resolvePageContext, getSuggestedPrompts } from '@/lib/page-context'
import {
  assistantChatStream,
  type ChatMessage,
  type StreamEvent,
} from '@/lib/assistant-api'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import type { AssistantToolStep } from '@/lib/assistant-api'

const MODELS = [
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat' },
  { id: 'openai/gpt-4o', name: 'GPT-4o' },
  { id: 'anthropic/claude-sonnet-5', name: 'Claude Sonnet 5' },
  { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B' },
  { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
]

type AssistantPanelProps = {
  onClose: () => void
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function AssistantPanel({ onClose }: AssistantPanelProps) {
  const pathname = usePathname()
  const pageContext = resolvePageContext(pathname)
  const suggested = getSuggestedPrompts(pageContext)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [toolStatus, setToolStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<string>('deepseek/deepseek-chat')
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, toolStatus])

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || busy) return

      setError(null)
      setBusy(true)
      setToolStatus(null)

      const userMsg: ChatMessage = { id: newId(), role: 'user', content: trimmed }
      const assistantId = newId()
      setMessages((prev) => [
        ...prev,
        userMsg,
        { id: assistantId, role: 'assistant', content: '', loading: true },
      ])
      setInput('')

      const history = messages
        .filter((m) => !m.loading && m.content)
        .slice(-12)
        .map((m) => ({ role: m.role, content: m.content }))

      let streamed = ''
      const controller = new AbortController()
      abortRef.current = controller

      try {
        const result = await assistantChatStream(
          { message: trimmed, history, pageContext, model: selectedModel },
          (event: StreamEvent) => {
            if (event.type === 'tool_start') {
              setToolStatus(`Fetching ${formatToolName(event.tool)}…`)
            }
            if (event.type === 'tool_done') {
              setToolStatus(null)
            }
            if (event.type === 'token') {
              streamed += event.content
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: streamed, loading: true }
                    : m,
                ),
              )
            }
            if (event.type === 'done') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        content: event.answer,
                        links: event.links,
                        toolSteps: event.toolSteps,
                        loading: false,
                      }
                    : m,
                ),
              )
            }
          },
          controller.signal,
        )

        if (!streamed && result.answer) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: result.answer,
                    links: result.links,
                    toolSteps: result.toolSteps,
                    loading: false,
                  }
                : m,
            ),
          )
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') {
          // User aborted — keep whatever was streamed so far
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: streamed || '*(Response stopped)*', loading: false }
                : m,
            ),
          )
        } else {
          const msg = e instanceof Error ? e.message : 'Assistant request failed'
          setError(msg)
          setMessages((prev) => prev.filter((m) => m.id !== assistantId))
        }
      } finally {
        abortRef.current = null
        setBusy(false)
        setToolStatus(null)
      }
    },
    [busy, messages, pageContext, selectedModel],
  )

  return (
    <div className="flex h-full min-h-0 flex-col bg-background/95">
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-border/60 px-3 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 shrink-0 text-violet-500" />
            LEJER Assistant
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">Read-only</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={onClose}
            aria-label="Close assistant panel"
          >
            <PanelRightClose className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1 px-3">
        <div className="space-y-4 py-4">
          {messages.length === 0 ? (
            <div className="space-y-3 rounded-xl border border-dashed border-border/80 bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Bot className="h-4 w-4" />
                Ask about your ERP data
              </div>
              <p className="text-xs text-muted-foreground">
                Page: {pageContext.pathname}
                {pageContext.entityType ? ` · ${pageContext.entityType}` : ''}
              </p>
              <div className="flex flex-wrap gap-2">
                {suggested.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="rounded-lg border border-border/70 bg-background px-2 py-1 text-left text-xs hover:bg-muted"
                    onClick={() => sendMessage(prompt)}
                    disabled={busy}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                'rounded-xl px-3 py-2 text-sm',
                m.role === 'user'
                  ? 'ml-6 bg-primary text-primary-foreground'
                  : 'mr-2 bg-muted/60',
              )}
            >
              {m.loading && !m.content ? (
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Thinking…
                </span>
              ) : (
                <p className="whitespace-pre-wrap">{m.content}</p>
              )}
              {m.toolSteps && m.toolSteps.length > 0 ? (
                <AssistantToolLogs steps={m.toolSteps} />
              ) : null}
              {m.links && m.links.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {m.links.map((link) => (
                    <Button
                      key={link.href}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      asChild
                    >
                      <Link href={link.href}>{link.label}</Link>
                    </Button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}

          {toolStatus ? (
            <p className="text-xs text-muted-foreground">{toolStatus}</p>
          ) : null}

          {error ? (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          ) : null}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t border-border/60 p-3">
        <div className="rounded-2xl border border-border/80 bg-muted/15 shadow-sm transition-shadow focus-within:border-border focus-within:ring-1 focus-within:ring-ring/30">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about orders, inventory, shortages…"
            rows={2}
            className="min-h-[72px] resize-none border-0 bg-transparent px-3 pt-3 pb-1 shadow-none focus-visible:ring-0"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage(input)
              }
            }}
            disabled={busy}
          />
          <div className="flex items-center justify-between gap-2 px-2 pb-2">
            <Select value={selectedModel} onValueChange={setSelectedModel} disabled={busy}>
              <SelectTrigger
                size="sm"
                className="h-7 max-w-[11rem] rounded-full border-border/70 bg-background/90 px-2.5 text-xs shadow-none focus:ring-1"
                aria-label="AI model"
              >
                <SelectValue placeholder="Model" />
              </SelectTrigger>
              <SelectContent align="start">
                {MODELS.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {busy ? (
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="h-8 w-8 shrink-0 rounded-full"
                onClick={() => abortRef.current?.abort()}
                aria-label="Stop generating"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </Button>
            ) : (
              <Button
                type="button"
                size="icon"
                className={cn(
                  'h-8 w-8 shrink-0 rounded-full transition-colors',
                  input.trim()
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-muted text-muted-foreground hover:bg-muted',
                )}
                onClick={() => sendMessage(input)}
                disabled={!input.trim()}
                aria-label="Send"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function AssistantTrigger({
  active,
  onClick,
}: {
  active?: boolean
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant={active ? 'secondary' : 'outline'}
      className={cn(
        'rounded-xl border-border/70 bg-background/60',
        active && 'ring-1 ring-violet-500/40',
      )}
      onClick={onClick}
      aria-label={active ? 'Close assistant panel' : 'Open assistant panel'}
      aria-pressed={active}
    >
      <Sparkles size={16} className="text-violet-500" />
      <span>Assistant</span>
    </Button>
  )
}

function AssistantToolLogs({ steps }: { steps: AssistantToolStep[] }) {
  const errorCount = steps.filter((s) => s.status === 'error').length

  return (
    <Collapsible className="mt-2">
      <CollapsibleTrigger className="group flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ChevronDown className="h-3 w-3 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
        <span>
          View Logs
          {errorCount > 0 ? ` (${steps.length}, ${errorCount} failed)` : ` (${steps.length})`}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="mt-1.5 max-h-48 space-y-0.5 overflow-y-auto border-l border-border/60 pl-2 text-xs text-muted-foreground">
          {steps.map((s, i) => (
            <li key={i}>
              {s.status === 'error' ? '✗' : '✓'} {formatToolName(s.tool)}
              {s.status === 'error' && s.summary ? ` — ${s.summary}` : ''}
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  )
}

function formatToolName(name: string): string {
  return name.replace(/_/g, ' ')
}
