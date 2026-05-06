'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Loader2, Search } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { cn } from '@/lib/utils'

export type ItemSearchValue = {
  id: string
  sku: string
  name: string
  item_type: string
}

type Props = {
  id?: string
  value: ItemSearchValue | null
  onChange: (item: ItemSearchValue | null) => void
  disabled?: boolean
  placeholder?: string
}

export function ItemSearchField({
  id = 'item-search',
  value,
  onChange,
  disabled,
  placeholder = 'Type SKU or name to search…',
}: Props) {
  const [itemQuery, setItemQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ItemSearchValue[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const searchWrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value) {
      setItemQuery(`${value.sku} — ${value.name}`)
    } else {
      setItemQuery('')
    }
  }, [value])

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!searchWrapRef.current?.contains(e.target as Node)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [])

  useEffect(() => {
    const q = itemQuery.trim()
    if (q.length < 1) {
      setSearchResults([])
      setSearchOpen(false)
      return
    }
    if (value && q === `${value.sku} — ${value.name}`) {
      setSearchResults([])
      setSearchOpen(false)
      return
    }
    const t = setTimeout(() => {
      void (async () => {
        setSearchLoading(true)
        try {
          const res = await erpFetch<{ data: ItemSearchValue[] }>(
            `/api/items?search=${encodeURIComponent(q)}&limit=40`,
          )
          setSearchResults(res.data ?? [])
          setSearchOpen(true)
        } catch {
          setSearchResults([])
        } finally {
          setSearchLoading(false)
        }
      })()
    }, 280)
    return () => clearTimeout(t)
  }, [itemQuery, value])

  const onItemQueryChange = (v: string) => {
    setItemQuery(v)
    onChange(null)
  }

  const selectSearchItem = (item: ItemSearchValue) => {
    onChange(item)
    setItemQuery(`${item.sku} — ${item.name}`)
    setSearchResults([])
    setSearchOpen(false)
  }

  const picked = value

  return (
    <div className="space-y-1 min-w-0 flex-1">
      <span className="text-xs text-muted-foreground">Item</span>
      <div className="relative" ref={searchWrapRef}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          id={id}
          value={itemQuery}
          onChange={(e) => onItemQueryChange(e.target.value)}
          onFocus={() => itemQuery.trim().length >= 1 && setSearchOpen(true)}
          placeholder={placeholder}
          className="pl-9"
          autoComplete="off"
          disabled={disabled}
        />
        {searchLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
        )}
        {searchOpen && searchResults.length > 0 && !picked && (
          <ul
            className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md"
            role="listbox"
          >
            {searchResults.map((item) => (
              <li key={item.id} role="option">
                <button
                  type="button"
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground',
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectSearchItem(item)}
                >
                  <span className="font-mono text-xs">{item.sku}</span>
                  <span className="mx-2 text-muted-foreground">—</span>
                  <span>{item.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {searchOpen &&
          !searchLoading &&
          itemQuery.trim().length >= 1 &&
          searchResults.length === 0 &&
          !picked && (
            <p className="absolute z-50 mt-1 w-full rounded-md border bg-popover px-3 py-2 text-sm text-muted-foreground shadow-md">
              No items match. Try another search.
            </p>
          )}
      </div>
      {picked && (
        <p className="text-xs text-muted-foreground">
          Selected: <strong>{picked.sku}</strong> — {picked.name}
        </p>
      )}
    </div>
  )
}
