import { createClient } from '@/lib/supabase/client'
import { getActiveOrganizationId } from '@/lib/organization-store'
import { erpFetch } from '@/lib/erp-api'
import type {
  CommMessage,
  CommNotification,
  CommUser,
  Conversation,
  MentionPayload,
  ObjectMentionResult,
} from '@/lib/communication-types'

type Data<T> = { data: T }

export async function listConversations(type?: string) {
  const qs = type ? `?type=${encodeURIComponent(type)}` : ''
  const res = await erpFetch<Data<Conversation[]>>(`/api/communication/conversations${qs}`)
  return res.data
}

export async function getConversation(id: string) {
  const res = await erpFetch<Data<Conversation>>(`/api/communication/conversations/${id}`)
  return res.data
}

export async function listOrgChatMembers() {
  const res = await erpFetch<Data<CommUser[]>>('/api/communication/members')
  return res.data
}

export async function createDirect(userId: string) {
  const res = await erpFetch<Data<Conversation>>('/api/communication/conversations/direct', {
    method: 'POST',
    body: { user_id: userId },
  })
  return res.data
}

export async function createGroup(input: {
  name: string
  description?: string
  member_ids?: string[]
}) {
  const res = await erpFetch<Data<Conversation>>('/api/communication/conversations/group', {
    method: 'POST',
    body: input,
  })
  return res.data
}

export async function createChannel(input: {
  name: string
  description?: string
  visibility?: 'public' | 'private'
  member_ids?: string[]
}) {
  const res = await erpFetch<Data<Conversation>>('/api/communication/conversations/channel', {
    method: 'POST',
    body: input,
  })
  return res.data
}

export async function getOrCreateObjectThread(objectType: string, objectId: string) {
  const res = await erpFetch<Data<Conversation>>(
    '/api/communication/conversations/object-thread',
    {
      method: 'POST',
      body: { object_type: objectType, object_id: objectId },
    },
  )
  return res.data
}

export async function listMessages(conversationId: string, cursor?: string) {
  const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
  const res = await erpFetch<{
    data: { messages: CommMessage[]; next_cursor: string | null }
  }>(`/api/communication/conversations/${conversationId}/messages${qs}`)
  return res.data
}

export async function sendMessage(
  conversationId: string,
  input: {
    body_text: string
    body_json?: Record<string, unknown>
    reply_to_id?: string | null
    mentions?: MentionPayload[]
    attachments?: Array<{
      file_name: string
      file_type?: string | null
      mime_type?: string | null
      file_size: number
      storage_path: string
    }>
  },
) {
  const res = await erpFetch<Data<CommMessage>>(
    `/api/communication/conversations/${conversationId}/messages`,
    { method: 'POST', body: input },
  )
  return res.data
}

export async function editMessage(
  messageId: string,
  input: { body_text: string; mentions?: MentionPayload[] },
) {
  const res = await erpFetch<Data<CommMessage>>(`/api/communication/messages/${messageId}`, {
    method: 'PATCH',
    body: input,
  })
  return res.data
}

export async function deleteMessage(messageId: string) {
  await erpFetch(`/api/communication/messages/${messageId}`, { method: 'DELETE' })
}

export async function toggleReaction(messageId: string, emoji: string) {
  const res = await erpFetch<Data<{ added: boolean; emoji: string }>>(
    `/api/communication/messages/${messageId}/reactions`,
    { method: 'POST', body: { emoji } },
  )
  return res.data
}

export async function markRead(conversationId: string, messageId?: string) {
  await erpFetch(`/api/communication/conversations/${conversationId}/read`, {
    method: 'POST',
    body: messageId ? { message_id: messageId } : {},
  })
}

export async function sendTyping(conversationId: string, active: boolean) {
  await erpFetch(`/api/communication/conversations/${conversationId}/typing`, {
    method: 'POST',
    body: { active },
  })
}

export async function uploadAttachment(file: File, conversationId?: string) {
  const form = new FormData()
  form.append('file', file)
  if (conversationId) form.append('conversation_id', conversationId)
  const res = await erpFetch<
    Data<{
      file_name: string
      file_type: string | null
      mime_type: string
      file_size: number
      storage_path: string
    }>
  >('/api/communication/attachments/upload', { method: 'POST', body: form })
  return res.data
}

export async function getAttachmentUrl(attachmentId: string) {
  const res = await erpFetch<Data<{ url: string }>>(
    `/api/communication/attachments/${attachmentId}/url`,
  )
  return res.data.url
}

export async function searchObjects(q: string, type?: string) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (type) params.set('type', type)
  const res = await erpFetch<Data<ObjectMentionResult[]>>(
    `/api/communication/mentions/objects?${params.toString()}`,
  )
  return res.data
}

export async function searchMessages(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString()
  const res = await erpFetch<Data<CommMessage[]>>(`/api/communication/search?${qs}`)
  return res.data
}

export async function listNotifications() {
  const res = await erpFetch<{ data: CommNotification[]; unread_count: number }>(
    '/api/communication/notifications',
  )
  return res
}

export async function markNotificationsRead(ids?: string[]) {
  await erpFetch('/api/communication/notifications/read', {
    method: 'POST',
    body: ids ? { ids } : {},
  })
}

/** Open SSE stream for realtime communication events. */
export async function openRealtimeStream(
  onEvent: (event: Record<string, unknown>) => void,
  onError?: (err: unknown) => void,
): Promise<() => void> {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')

  const base = process.env.NEXT_PUBLIC_ERP_API_URL?.replace(/\/$/, '')
  if (!base) throw new Error('NEXT_PUBLIC_ERP_API_URL is not set')

  const orgId = getActiveOrganizationId()
  const url = `${base}/api/communication/realtime`
  const controller = new AbortController()

  void (async () => {
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          ...(orgId ? { 'X-Organization-Id': orgId } : {}),
          Accept: 'text/event-stream',
        },
        signal: controller.signal,
      })
      if (!res.ok || !res.body) throw new Error(`Realtime failed: ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''
        for (const part of parts) {
          const line = part
            .split('\n')
            .find((l) => l.startsWith('data: '))
          if (!line) continue
          try {
            const json = JSON.parse(line.slice(6)) as Record<string, unknown>
            onEvent(json)
          } catch {
            /* ignore malformed */
          }
        }
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') onError?.(e)
    }
  })()

  return () => controller.abort()
}
