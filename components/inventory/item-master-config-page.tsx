'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type MasterRow = {
  id: string
  name: string
  is_system?: boolean
}

type Props = {
  title: string
  description: string
  listEndpoint: string
  createEndpoint: string
  nameLabel: string
  namePlaceholder: string
  emptyMessage: string
  backHref?: string
}

export function ItemMasterConfigPage({
  title,
  description,
  listEndpoint,
  createEndpoint,
  nameLabel,
  namePlaceholder,
  emptyMessage,
  backHref = '/dashboard/inventory/items/new',
}: Props) {
  const [rows, setRows] = useState<MasterRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await erpFetch<{ data: MasterRow[] }>(listEndpoint)
      setRows(res.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [listEndpoint])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError(`${nameLabel} is required.`)
      return
    }
    setSaving(true)
    setError(null)
    try {
      await erpFetch(createEndpoint, {
        method: 'POST',
        body: JSON.stringify({ name: name.trim() }),
      })
      setName('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" asChild>
          <Link href={backHref} aria-label="Back">
            <ArrowLeft size={20} />
          </Link>
        </Button>
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">{title}</h1>
          <p className="text-gray-600 mt-2">{description}</p>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Existing values</CardTitle>
          <CardDescription>
            Names cannot be changed or deleted once added.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {rows.map((row) => (
                <li key={row.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="font-medium">{row.name}</span>
                  {row.is_system ? (
                    <span className="text-xs text-muted-foreground">Default</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus size={20} />
            Add new
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void add(e)} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="master-name">{nameLabel}</Label>
              <Input
                id="master-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={namePlaceholder}
                maxLength={120}
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" disabled={saving}>
              {saving ? 'Adding…' : 'Add'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
