'use client'

import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { searchMessages } from '@/lib/communication-api'
import type { CommMessage } from '@/lib/communication-types'
import { Button } from '@/components/ui/button'

export function SearchPanel({
  onJump,
}: {
  onJump: (conversationId: string, messageId: string) => void
}) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<CommMessage[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!q.trim()) {
      setResults([])
      return
    }
    const t = setTimeout(() => {
      setLoading(true)
      void searchMessages({ q: q.trim() })
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(t)
  }, [q])

  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search messages…"
          className="pl-8"
        />
      </div>
      {loading ? <div className="text-xs text-muted-foreground">Searching…</div> : null}
      <div className="flex max-h-64 flex-col gap-1 overflow-auto">
        {results.map((m) => (
          <Button
            key={m.id}
            variant="ghost"
            className="h-auto justify-start px-2 py-2 text-left"
            onClick={() => onJump(m.conversation_id, m.id)}
          >
            <div className="min-w-0">
              <div className="truncate text-xs font-medium">
                {m.sender?.display_name ?? 'Unknown'}
              </div>
              <div className="truncate text-xs text-muted-foreground">{m.body_text}</div>
            </div>
          </Button>
        ))}
      </div>
    </div>
  )
}
