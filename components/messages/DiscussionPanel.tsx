'use client'

import { useCallback, useEffect, useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageThread } from '@/components/messages/MessageThread'
import { getOrCreateObjectThread } from '@/lib/communication-api'
import type { Conversation } from '@/lib/communication-types'
import { useOrganization } from '@/lib/organization-context'

export function DiscussionPanel({
  objectType,
  objectId,
  title = 'Discussion',
}: {
  objectType: string
  objectId?: string | null
  title?: string
}) {
  const { me } = useOrganization()
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!objectId) return
    setLoading(true)
    setError(null)
    try {
      const c = await getOrCreateObjectThread(objectType, objectId)
      setConversation(c)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to open discussion')
    } finally {
      setLoading(false)
    }
  }, [objectId, objectType])

  useEffect(() => {
    void load()
  }, [load])

  if (!objectId) return null

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4" />
          {title}
        </CardTitle>
        <CardDescription>
          Team discussion for this record. Mentions, files, and replies work the same as Messages.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="px-6 py-8 text-sm text-muted-foreground">Opening discussion…</div>
        ) : error ? (
          <div className="px-6 py-8 text-sm text-destructive">{error}</div>
        ) : conversation ? (
          <div className="h-[420px] border-t">
            <MessageThread
              conversation={conversation}
              currentUserId={me?.user?.id}
              compact
              hideHeader
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
