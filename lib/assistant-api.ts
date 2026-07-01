import { createClient } from '@/lib/supabase/client'
import type { PageContext } from '@/lib/page-context'

export type AssistantSource = {
  type: string
  id: string
  label?: string
}

export type AssistantLink = {
  label: string
  href: string
}

export type AssistantToolStep = {
  tool: string
  status: 'running' | 'done' | 'error'
  summary?: string
}

export type AssistantChatResponse = {
  answer: string
  sources: AssistantSource[]
  links: AssistantLink[]
  toolSteps: AssistantToolStep[]
  usage?: { promptTokens: number; completionTokens: number }
}

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  links?: AssistantLink[]
  toolSteps?: AssistantToolStep[]
  loading?: boolean
}

function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_ERP_API_URL
  if (!url) {
    throw new Error('NEXT_PUBLIC_ERP_API_URL is not set')
  }
  return url.replace(/\/$/, '')
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')
  return {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true',
  }
}

export async function assistantChat(input: {
  message: string
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
  pageContext?: PageContext
  model?: string
}): Promise<AssistantChatResponse> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${getBaseUrl()}/api/assistant/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = body as { error?: string }
    throw new Error(err.error ?? res.statusText)
  }
  const data = (body as { data: AssistantChatResponse }).data
  return data
}

export type StreamEvent =
  | { type: 'token'; content: string }
  | { type: 'tool_start'; tool: string }
  | { type: 'tool_done'; tool: string; summary?: string }
  | { type: 'done'; answer: string; sources: AssistantSource[]; links: AssistantLink[]; toolSteps: AssistantToolStep[] }
  | { type: 'error'; error: string }

export async function assistantChatStream(
  input: {
    message: string
    history?: Array<{ role: 'user' | 'assistant'; content: string }>
    pageContext?: PageContext
    model?: string
  },
  onEvent: (event: StreamEvent) => void,
): Promise<AssistantChatResponse> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${getBaseUrl()}/api/assistant/chat/stream`, {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const err = body as { error?: string }
    throw new Error(err.error ?? res.statusText)
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''
  let final: AssistantChatResponse | null = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      try {
        const event = JSON.parse(line.slice(6)) as StreamEvent
        onEvent(event)
        if (event.type === 'done') {
          final = {
            answer: event.answer,
            sources: event.sources,
            links: event.links,
            toolSteps: event.toolSteps,
          }
        }
        if (event.type === 'error') {
          throw new Error(event.error)
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue
        throw e
      }
    }
  }

  if (!final) throw new Error('Stream ended without completion')
  return final
}
