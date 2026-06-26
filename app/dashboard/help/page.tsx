'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { HelpCircle, Send, Loader2, Bot, User, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { supportChatStream, type SupportChatMessage } from '@/lib/support-api'

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

const SUGGESTED_HELP_PROMPTS = [
  'How do I run database migrations?',
  'How to deploy the app to Vercel?',
  'Why is the database connection failing?',
  'How do I add a new employee?',
  'What is the structure of this ERP project?'
]

export default function HelpSupportPage() {
  const [messages, setMessages] = useState<SupportChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || busy) return

    setError(null)
    setBusy(true)

    const userMsg: SupportChatMessage = { id: newId(), role: 'user', content: trimmed }
    const assistantId = newId()

    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: 'assistant', content: '', loading: true }
    ])
    setInput('')

    // Slice last 12 messages for history
    const history = messages
      .filter((m) => !m.loading && m.content)
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content }))

    let streamed = ''

    try {
      await supportChatStream(
        { message: trimmed, history },
        (event) => {
          if (event.type === 'token') {
            streamed += event.content
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: streamed, loading: true } : m
              )
            )
          }
          if (event.type === 'done') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: event.answer, loading: false } : m
              )
            )
          }
          if (event.type === 'error') {
            throw new Error(event.error)
          }
        }
      )
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to reach the support assistant'
      setError(msg)
      setMessages((prev) => prev.filter((m) => m.id !== assistantId))
    } finally {
      setBusy(false)
    }
  }, [busy, messages])

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 overflow-hidden">
        {/* Header Section */}
        <div className="flex flex-col gap-1 shrink-0">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
            <Sparkles className="h-6 w-6 text-indigo-400" />
            ERP Help & Support Center
          </h1>
          <p className="text-sm text-slate-400">
            Troubleshoot local deployments, configurations, or browse system documentation with our lightweight Support Desk.
          </p>
        </div>

        {/* Main Interface Layout */}
        <div className="flex flex-1 gap-6 overflow-hidden min-h-0">
          {/* Chat Container */}
          <Card className="flex flex-1 flex-col overflow-hidden border-slate-800 bg-[#0d1117] text-slate-100">
            {/* Scrollable messages area */}
            <ScrollArea className="flex-1 p-4 min-h-0">
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-4 rounded-full bg-slate-900 p-3 text-indigo-400 border border-slate-800">
                      <HelpCircle className="h-8 w-8" />
                    </div>
                    <h3 className="font-semibold text-lg text-white">How can we help you today?</h3>
                    <p className="text-sm text-slate-400 max-w-sm mt-1">
                      Ask about migrations, Vercel deployments, codebase layout, or basic troubleshooting steps.
                    </p>
                  </div>
                ) : null}

                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "flex gap-3 rounded-xl p-4 text-sm leading-relaxed",
                      m.role === 'user'
                        ? "bg-indigo-600/10 border border-indigo-500/20 text-indigo-100 ml-12"
                        : "bg-slate-900/60 border border-slate-800 text-slate-200 mr-12"
                    )}
                  >
                    <div className="mt-0.5 shrink-0">
                      {m.role === 'user' ? (
                        <div className="rounded-md bg-indigo-500 p-1 text-white">
                          <User className="h-4 w-4" />
                        </div>
                      ) : (
                        <div className="rounded-md bg-emerald-500 p-1 text-white">
                          <Bot className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      {m.loading && !m.content ? (
                        <span className="flex items-center gap-2 text-slate-400 text-xs">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Consulting system documentation…
                        </span>
                      ) : (
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      )}
                    </div>
                  </div>
                ))}

                {error ? (
                  <div className="flex items-center gap-2 rounded-lg bg-red-950/40 border border-red-900/30 p-3 text-xs text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>Error: {error}</span>
                  </div>
                ) : null}

                <div ref={bottomRef} />
              </div>
            </ScrollArea>

            {/* Input area */}
            <div className="border-t border-slate-800 bg-[#090d13] p-4 shrink-0">
              <div className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a support question (e.g. How do I run setup-database.sql?)..."
                  rows={2}
                  className="min-h-[50px] resize-none border-slate-800 bg-slate-950 text-slate-200 placeholder:text-slate-500 focus-visible:ring-indigo-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend(input)
                    }
                  }}
                  disabled={busy}
                />
                <Button
                  type="button"
                  size="icon"
                  className="h-auto shrink-0 self-stretch bg-indigo-600 hover:bg-indigo-500 text-white px-4"
                  onClick={() => handleSend(input)}
                  disabled={busy || !input.trim()}
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {/* Quick Suggestions / Sidebar */}
          <Card className="w-80 border-slate-800 bg-[#0d1117] text-slate-100 flex flex-col shrink-0">
            <CardHeader className="p-4 border-b border-slate-800 shrink-0">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-white">
                <HelpCircle className="h-4 w-4 text-indigo-400" />
                Common Help Topics
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Click any suggestion to ask instantly.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 flex-1 overflow-y-auto space-y-2">
              {SUGGESTED_HELP_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-left text-xs transition-colors hover:bg-slate-800/60 hover:text-white"
                  onClick={() => handleSend(prompt)}
                  disabled={busy}
                >
                  {prompt}
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
