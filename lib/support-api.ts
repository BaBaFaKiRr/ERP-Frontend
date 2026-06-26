import { createClient } from '@/lib/supabase/client'

export type SupportChatResponse = {
  answer: string
}

export type SupportChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
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
  }
}

export async function supportChat(input: {
  message: string
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
}): Promise<SupportChatResponse> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${getBaseUrl()}/api/support/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = body as { error?: string }
    throw new Error(err.error ?? res.statusText)
  }
  const data = (body as { data: SupportChatResponse }).data
  return data
}

export type SupportStreamEvent =
  | { type: 'token'; content: string }
  | { type: 'done'; answer: string }
  | { type: 'error'; error: string }

export async function supportChatStream(
  input: {
    message: string
    history?: Array<{ role: 'user' | 'assistant'; content: string }>
  },
  onEvent: (event: SupportStreamEvent) => void,
): Promise<SupportChatResponse> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${getBaseUrl()}/api/support/chat/stream`, {
    // Wait, the backend prefix in routes/index.ts is /support, so the endpoint is /api/support/chat/stream
    // Let's verify: apiRouter.use('/support', supportRouter)
    // So the path is indeed /api/support/chat/stream!
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
  let final: SupportChatResponse | null = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      try {
        const event = JSON.parse(line.slice(6)) as SupportStreamEvent
        onEvent(event)
        if (event.type === 'done') {
          final = {
            answer: event.answer,
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
