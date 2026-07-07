'use client'

import { Eye, Pencil, Star, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

type SavedProfileRowProps = {
  alias: string
  isDefault: boolean
  defaultLabel?: string
  notDefaultLabel?: string
  onView: () => void
  onEdit: () => void
  onDelete: () => void
  onSetDefault: () => void
}

export function SavedProfileRow({
  alias,
  isDefault,
  defaultLabel = 'Default profile',
  notDefaultLabel = 'Not default',
  onView,
  onEdit,
  onDelete,
  onSetDefault,
}: SavedProfileRowProps) {
  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="min-w-0">
        <p className="truncate font-medium">{alias}</p>
        <p className="text-xs text-muted-foreground">{isDefault ? defaultLabel : notDefaultLabel}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onView}>
          <Eye className="mr-1 size-4" />
          View
        </Button>
        {!isDefault ? (
          <Button variant="outline" size="sm" onClick={onSetDefault}>
            <Star className="mr-1 size-4" />
            Set Default
          </Button>
        ) : (
          <Button variant="secondary" size="sm" disabled>
            <Star className="mr-1 size-4" />
            Default
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil className="mr-1 size-4" />
          Edit
        </Button>
        <Button variant="destructive" size="sm" onClick={onDelete}>
          <Trash2 className="mr-1 size-4" />
          Delete
        </Button>
      </div>
    </div>
  )
}
