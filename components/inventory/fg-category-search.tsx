'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FINISHED_GOOD_CATEGORIES } from '@/lib/finished-good-categories'

type Props = {
  id?: string
  value: string | null
  onChange: (category: string | null) => void
  disabled?: boolean
}

export function FgCategorySearch({ id = 'fg-category-search', value, onChange, disabled }: Props) {
  const [query, setQuery] = useState(value ?? '')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setQuery(value ?? '')
  }, [value])

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [])

  const q = query.trim().toLowerCase()
  const matches = FINISHED_GOOD_CATEGORIES.filter((c) =>
    q.length < 1 ? true : c.toLowerCase().includes(q),
  )

  const onQueryChange = (v: string) => {
    setQuery(v)
    onChange(null)
  }

  const selectCategory = (c: string) => {
    onChange(c)
    setQuery(c)
    setOpen(false)
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>Category</Label>
      <div className="relative" ref={wrapRef}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          id={id}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Type to search categories…"
          className="pl-9"
          autoComplete="off"
          disabled={disabled}
        />
        {open && matches.length > 0 && !value && (
          <ul
            className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md"
            role="listbox"
          >
            {matches.map((c) => (
              <li key={c} role="option">
                <button
                  type="button"
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground',
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectCategory(c)}
                >
                  {c}
                </button>
              </li>
            ))}
          </ul>
        )}
        {open && matches.length === 0 && !value && (
          <p className="absolute z-50 mt-1 w-full rounded-md border bg-popover px-3 py-2 text-sm text-muted-foreground shadow-md">
            No categories match. Try another search.
          </p>
        )}
      </div>
      {value && (
        <p className="text-xs text-muted-foreground">
          Selected: <strong>{value}</strong>
        </p>
      )}
    </div>
  )
}
