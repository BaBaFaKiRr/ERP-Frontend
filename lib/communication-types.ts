export type ConversationType = 'direct' | 'group' | 'channel' | 'object_thread'

export type CommUser = {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  display_name: string
}

export type MentionPayload = {
  type: string
  id: string
  display: string
  object_type?: string
}

export type MessageAttachment = {
  id: string
  file_name: string
  file_type: string | null
  mime_type: string | null
  file_size: number
  storage_path: string
}

export type MessageMention = {
  id: string
  mention_type: 'user' | 'object'
  mention_id: string
  display: string
  object_type: string | null
}

export type MessageReaction = {
  emoji: string
  count: number
  user_ids: string[]
}

export type CommMessage = {
  id: string
  conversation_id: string
  sender_id: string | null
  body_text: string
  body_json: Record<string, unknown>
  reply_to_id: string | null
  edited_at: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
  sender: CommUser | null
  attachments: MessageAttachment[]
  mentions: MessageMention[]
  reactions: MessageReaction[]
  reply_to: {
    id: string
    body_text: string
    sender_id: string | null
    deleted_at: string | null
    sender: CommUser | null
  } | null
}

export type Conversation = {
  id: string
  type: ConversationType
  name: string | null
  title: string | null
  description: string | null
  avatar_url: string | null
  visibility: 'public' | 'private'
  object_type: string | null
  object_id: string | null
  object_label: string | null
  last_message_at: string | null
  last_message_preview: string | null
  created_at: string
  other_user: CommUser | null
  members: Array<{ user_id: string; role: string; user: CommUser | null }>
  membership: { role: string; last_read_at: string | null; muted: boolean } | null
  unread_count: number
}

export type CommNotification = {
  id: string
  type: string
  title: string
  body: string | null
  conversation_id: string | null
  message_id: string | null
  read_at: string | null
  created_at: string
}

export type ObjectMentionResult = {
  type: string
  id: string
  display: string
}

export const OBJECT_HREF: Record<string, (id: string) => string> = {
  sales_order: (id) => `/dashboard/sales/${id}`,
  customer: (id) => `/dashboard/sales/customers/${id}`,
  purchase_order: (id) => `/dashboard/purchase/orders/${id}`,
  supplier: (id) => `/dashboard/purchase/suppliers/${id}`,
  item: (id) => `/dashboard/inventory/items/${id}`,
  employee: (id) => `/dashboard/hr/${id}`,
  work_order: (id) => `/dashboard/manufacturing/work-orders/${id}`,
  sales_invoice: (id) => `/dashboard/finance/sales-invoices/${id}`,
}
