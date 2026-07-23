'use client'

import { useEffect, useState } from 'react'
import { FileIcon, ImageIcon } from 'lucide-react'
import { getAttachmentUrl } from '@/lib/communication-api'
import type { MessageAttachment } from '@/lib/communication-types'
import { Button } from '@/components/ui/button'

export function AttachmentViewer({ attachment }: { attachment: MessageAttachment }) {
  const [url, setUrl] = useState<string | null>(null)
  const isImage = (attachment.mime_type ?? '').startsWith('image/')

  useEffect(() => {
    let cancelled = false
    void getAttachmentUrl(attachment.id)
      .then((u) => {
        if (!cancelled) setUrl(u)
      })
      .catch(() => {
        if (!cancelled) setUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [attachment.id])

  if (isImage && url) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block max-w-xs overflow-hidden rounded-lg border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={attachment.file_name} className="max-h-48 w-full object-cover" />
      </a>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
      {isImage ? <ImageIcon className="h-4 w-4" /> : <FileIcon className="h-4 w-4" />}
      <span className="truncate max-w-[180px]">{attachment.file_name}</span>
      {url ? (
        <Button asChild variant="ghost" size="sm" className="h-7 px-2">
          <a href={url} target="_blank" rel="noreferrer">
            Open
          </a>
        </Button>
      ) : null}
    </div>
  )
}
