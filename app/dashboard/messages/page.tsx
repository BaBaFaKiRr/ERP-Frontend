'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Hash,
  MessageSquare,
  Plus,
  Search,
  Users,
  UserRound,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConversationList } from '@/components/messages/ConversationList'
import { MessageThread } from '@/components/messages/MessageThread'
import { SearchPanel } from '@/components/messages/SearchPanel'
import { NotificationDropdown } from '@/components/messages/NotificationDropdown'
import {
  createChannel,
  createDirect,
  createGroup,
  listConversations,
  listOrgChatMembers,
  openRealtimeStream,
} from '@/lib/communication-api'
import type { CommUser, Conversation } from '@/lib/communication-types'
import { useOrganization } from '@/lib/organization-context'
import { cn } from '@/lib/utils'

type SidebarTab = 'all' | 'direct' | 'group' | 'channel'

export default function MessagesPage() {
  const { me } = useOrganization()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [tab, setTab] = useState<SidebarTab>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [members, setMembers] = useState<CommUser[]>([])
  const [typingByConv, setTypingByConv] = useState<Record<string, string[]>>({})

  const [dmOpen, setDmOpen] = useState(false)
  const [groupOpen, setGroupOpen] = useState(false)
  const [channelOpen, setChannelOpen] = useState(false)
  const [dmUserId, setDmUserId] = useState('')
  const [groupName, setGroupName] = useState('')
  const [groupMembers, setGroupMembers] = useState<string[]>([])
  const [channelName, setChannelName] = useState('')
  const [creating, setCreating] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const data = await listConversations()
      setConversations(data)
      setError(null)
      return data
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load conversations')
      return []
    }
  }, [])

  const handleThreadMessageEvent = useCallback(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    setLoading(true)
    void refresh().finally(() => setLoading(false))
    void listOrgChatMembers().then(setMembers).catch(() => setMembers([]))
  }, [refresh])

  useEffect(() => {
    let close: (() => void) | undefined
    let cancelled = false

    void openRealtimeStream(
      (event) => {
        if (cancelled) return
        const type = String(event.type ?? '')
        const conversationId = event.conversationId as string | undefined
        const payload = (event.payload ?? {}) as Record<string, unknown>

        window.dispatchEvent(
          new CustomEvent('lejer-comm-event', {
            detail: {
              type,
              conversationId,
              message: payload.message,
              ...payload,
            },
          }),
        )

        if (
          type === 'message.created' ||
          type === 'conversation.updated' ||
          type === 'member.joined'
        ) {
          void refresh()
        }

        if (type === 'typing.started' || type === 'typing.stopped') {
          const typingPayload = payload as {
            user_id?: string
            display_name?: string
          }
          if (!conversationId || !typingPayload.user_id || typingPayload.user_id === me?.user?.id) {
            return
          }
          setTypingByConv((prev) => {
            const cur = new Set(prev[conversationId] ?? [])
            const name = typingPayload.display_name || 'Someone'
            if (type === 'typing.started') cur.add(name)
            else cur.delete(name)
            return { ...prev, [conversationId]: [...cur] }
          })
        }
      },
      () => {
        /* reconnect soft-fail */
      },
    ).then((fn) => {
      close = fn
    })

    return () => {
      cancelled = true
      close?.()
    }
  }, [me?.user?.id, refresh])

  const filtered = useMemo(() => {
    if (tab === 'all') {
      return conversations.filter((c) => c.type !== 'object_thread')
    }
    return conversations.filter((c) => c.type === tab)
  }, [conversations, tab])

  const active = conversations.find((c) => c.id === activeId) ?? null

  const startDm = async () => {
    if (!dmUserId) return
    setCreating(true)
    try {
      const c = await createDirect(dmUserId)
      await refresh()
      setActiveId(c.id)
      setDmOpen(false)
      setDmUserId('')
    } finally {
      setCreating(false)
    }
  }

  const startGroup = async () => {
    if (!groupName.trim()) return
    setCreating(true)
    try {
      const c = await createGroup({ name: groupName.trim(), member_ids: groupMembers })
      await refresh()
      setActiveId(c.id)
      setGroupOpen(false)
      setGroupName('')
      setGroupMembers([])
    } finally {
      setCreating(false)
    }
  }

  const startChannel = async () => {
    if (!channelName.trim()) return
    setCreating(true)
    try {
      const name = channelName.trim().replace(/^#/, '')
      const c = await createChannel({ name, visibility: 'public' })
      await refresh()
      setActiveId(c.id)
      setChannelOpen(false)
      setChannelName('')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="flex h-full min-h-0 w-full max-w-[320px] shrink-0 flex-col border-r bg-muted/20 px-2">
        <div className="flex h-14 items-center gap-2 border-b px-2">
          <MessageSquare className="h-4 w-4" />
          <span className="text-sm font-semibold">Messages</span>
          <div className="ml-auto flex items-center gap-1">
            <NotificationDropdown onOpenConversation={setActiveId} />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowSearch((v) => !v)}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {showSearch ? (
          <SearchPanel
            onJump={(conversationId) => {
              setActiveId(conversationId)
              setShowSearch(false)
            }}
          />
        ) : null}

        <div className="flex items-center gap-1 border-b px-1 py-2">
          <Button size="sm" variant="outline" className="h-8 flex-1 gap-1 text-xs" onClick={() => setDmOpen(true)}>
            <UserRound className="h-3.5 w-3.5" /> DM
          </Button>
          <Button size="sm" variant="outline" className="h-8 flex-1 gap-1 text-xs" onClick={() => setGroupOpen(true)}>
            <Users className="h-3.5 w-3.5" /> Group
          </Button>
          <Button size="sm" variant="outline" className="h-8 flex-1 gap-1 text-xs" onClick={() => setChannelOpen(true)}>
            <Hash className="h-3.5 w-3.5" /> Channel
          </Button>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as SidebarTab)} className="px-1 pt-2">
          <TabsList className="grid h-8 w-full grid-cols-4">
            <TabsTrigger value="all" className="text-[11px]">All</TabsTrigger>
            <TabsTrigger value="direct" className="text-[11px]">DMs</TabsTrigger>
            <TabsTrigger value="group" className="text-[11px]">Groups</TabsTrigger>
            <TabsTrigger value="channel" className="text-[11px]">Channels</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="min-h-0 flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="px-2 py-6 text-xs text-muted-foreground">Loading…</div>
          ) : error ? (
            <div className="px-2 py-6 text-xs text-destructive">{error}</div>
          ) : (
            <ConversationList
              conversations={filtered}
              activeId={activeId}
              onSelect={setActiveId}
              emptyLabel="Start a DM, group, or channel"
            />
          )}
        </div>
      </aside>

      {/* Main */}
      <main
        className={cn(
          'flex h-full min-h-0 min-w-0 flex-1 flex-col px-4 md:px-6',
          !activeId && 'hidden md:flex',
        )}
      >
        {active ? (
          <MessageThread
            conversation={active}
            currentUserId={me?.user?.id}
            onMessageEvent={handleThreadMessageEvent}
            typingNames={typingByConv[active.id] ?? []}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-muted-foreground">
            <MessageSquare className="h-10 w-10 opacity-40" />
            <div className="text-sm">Select a conversation or start a new one</div>
            <Button size="sm" onClick={() => setDmOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> New message
            </Button>
          </div>
        )}
      </main>

      {/* New DM */}
      <Dialog open={dmOpen} onOpenChange={setDmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New direct message</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Person</Label>
            <select
              className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={dmUserId}
              onChange={(e) => setDmUserId(e.target.value)}
            >
              <option value="">Select teammate…</option>
              {members
                .filter((m) => m.id !== me?.user?.id)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.display_name}
                    {m.email ? ` (${m.email})` : ''}
                  </option>
                ))}
            </select>
          </div>
          <DialogFooter>
            <Button disabled={!dmUserId || creating} onClick={() => void startDm()}>
              Start chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New group */}
      <Dialog open={groupOpen} onOpenChange={setGroupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create group</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Warehouse team" />
            </div>
            <div className="space-y-2">
              <Label>Members</Label>
              <div className="max-h-40 space-y-1 overflow-auto rounded-md border p-2">
                {members
                  .filter((m) => m.id !== me?.user?.id)
                  .map((m) => {
                    const checked = groupMembers.includes(m.id)
                    return (
                      <label key={m.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setGroupMembers((prev) =>
                              checked ? prev.filter((id) => id !== m.id) : [...prev, m.id],
                            )
                          }
                        />
                        {m.display_name}
                      </label>
                    )
                  })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button disabled={!groupName.trim() || creating} onClick={() => void startGroup()}>
              Create group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New channel */}
      <Dialog open={channelOpen} onOpenChange={setChannelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create channel</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Channel name</Label>
            <Input
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder="general"
            />
          </div>
          <DialogFooter>
            <Button disabled={!channelName.trim() || creating} onClick={() => void startChannel()}>
              Create channel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
