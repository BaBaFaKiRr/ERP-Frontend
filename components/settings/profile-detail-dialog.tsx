'use client'

import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export type ProfileDetailField = {
  label: string
  value: string
}

export type ProfileDetailContent = {
  title: string
  isDefault: boolean
  fields?: ProfileDetailField[]
  textContent?: {
    label: string
    value: string
    renderAsHtml?: boolean
  }
}

type ProfileDetailDialogProps = {
  content: ProfileDetailContent | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function ReadOnlyField({ label, value }: ProfileDetailField) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm whitespace-pre-wrap break-words">{value.trim() ? value : '—'}</p>
    </div>
  )
}

function ReadOnlyTextBlock({
  label,
  value,
  renderAsHtml = false,
}: NonNullable<ProfileDetailContent['textContent']>) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {renderAsHtml ? (
        <div
          className="rounded-md border bg-muted/20 p-3 text-sm [&_b]:font-bold [&_i]:italic [&_u]:underline"
          dangerouslySetInnerHTML={{ __html: value.trim() || '—' }}
        />
      ) : (
        <div className="whitespace-pre-wrap rounded-md border bg-muted/20 p-3 text-sm">
          {value.trim() ? value : '—'}
        </div>
      )}
    </div>
  )
}

export function ProfileDetailDialog({ content, open, onOpenChange }: ProfileDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        {content ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2 pr-6">
                {content.title}
                {content.isDefault ? <Badge variant="secondary">Default</Badge> : null}
              </DialogTitle>
              <DialogDescription>Read-only profile details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {content.fields?.map((field) => (
                <ReadOnlyField key={field.label} label={field.label} value={field.value} />
              ))}
              {content.textContent ? <ReadOnlyTextBlock {...content.textContent} /> : null}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
