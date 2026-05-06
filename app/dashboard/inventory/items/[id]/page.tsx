'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ArrowLeft, Package, Trash2 } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { cn } from '@/lib/utils'

type ItemDetail = {
  id: string
  sku: string
  name: string
  description: string | null
  item_type: string
  fg_category: string | null
  uom: string
  standard_cost: number | null
  standard_cost_uom: string | null
  hsn: string | null
  cost_per_unit: number | null
  price_per_unit: number | null
  mrp: number | null
  reserve_quantity: number
  reorder_level: number
  track_inventory: boolean
  is_active: boolean
  created_at?: string
}

function formatItemType(t: string) {
  return t.replace(/_/g, ' ')
}

function formatStandardCost(cost: number | null, uom: string | null) {
  if (cost == null) return '—'
  return `${Number(cost)} INR / ${uom ?? 'pcs'}`
}

function formatInr(n: number | null) {
  if (n == null) return '—'
  return `₹${Number(n).toFixed(2)}`
}

export default function ItemDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params.id === 'string' ? params.id : ''

  const [item, setItem] = useState<ItemDetail | null>(null)
  const [me, setMe] = useState<{ role: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadItem = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const res = await erpFetch<{ data: ItemDetail }>(`/api/items/${id}`)
      setItem(res.data ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load item')
      setItem(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void loadItem()
  }, [loadItem])

  useEffect(() => {
    void (async () => {
      try {
        const res = await erpFetch<{ user: { role: string } }>('/api/me')
        setMe(res.user ?? null)
      } catch {
        setMe(null)
      }
    })()
  }, [])

  const isAdmin = me?.role === 'admin'

  const handleDelete = async () => {
    if (!id) return
    setDeleting(true)
    try {
      await erpFetch(`/api/items/${id}`, { method: 'DELETE' })
      setDeleteOpen(false)
      router.push('/dashboard/inventory/items')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete item')
    } finally {
      setDeleting(false)
    }
  }

  if (loading && !item) {
    return <div className="p-8 text-muted-foreground">Loading item…</div>
  }

  if (error || !item) {
    return (
      <div className="p-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard/inventory/items">
            <ArrowLeft className="mr-2 size-4" />
            Back to items
          </Link>
        </Button>
        <p className="text-destructive">{error ?? 'Item not found'}</p>
      </div>
    )
  }

  const isFg = item.item_type === 'finished_good'

  return (
    <div className={cn('p-8 max-w-3xl', !item.is_active && 'opacity-90')}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/inventory/items" aria-label="Back">
              <ArrowLeft size={20} />
            </Link>
          </Button>
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white font-mono">{item.sku}</h1>
            <p className="text-gray-600 mt-1 text-lg">{item.name}</p>
            {!item.is_active && (
              <p className="text-sm font-medium text-amber-800 mt-2">Inactive (deleted)</p>
            )}
          </div>
        </div>
        {isAdmin && (
          <Button
            variant="outline"
            className="text-destructive border-destructive/50 hover:bg-destructive/10 gap-2 shrink-0"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
            Delete item
          </Button>
        )}
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this item?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-mono font-medium">{item.sku}</span> will be{' '}
              <strong>removed permanently</strong> from the catalog. This cannot be undone. If the item is
              still referenced on orders or BOMs, deletion will be blocked until those references are
              cleared.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="destructive" disabled={deleting} onClick={() => void handleDelete()}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package size={22} />
              Overview
            </CardTitle>
            <CardDescription>Master record for inventory and documents.</CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Type</p>
              <p className="font-medium capitalize">{formatItemType(item.item_type)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Stock UOM</p>
              <p className="font-medium">{item.uom}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Track inventory</p>
              <p className="font-medium">{item.track_inventory ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Active</p>
              <p className="font-medium">{item.is_active ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Reserve quantity</p>
              <p className="font-medium">{item.reserve_quantity}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Reorder level</p>
              <p className="font-medium">{item.reorder_level}</p>
            </div>
            {item.description && (
              <div className="sm:col-span-2">
                <p className="text-muted-foreground">Description</p>
                <p className="font-medium whitespace-pre-wrap">{item.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {isFg ? (
          <Card>
            <CardHeader>
              <CardTitle>HSN &amp; pricing (INR per {item.uom})</CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Category</p>
                <p className="font-medium">{item.fg_category?.trim() || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">HSN</p>
                <p className="font-mono font-medium">{item.hsn?.trim() || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Cost per unit</p>
                <p className="font-medium tabular-nums">{formatInr(item.cost_per_unit)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Price per unit</p>
                <p className="font-medium tabular-nums">{formatInr(item.price_per_unit)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">MRP</p>
                <p className="font-medium tabular-nums">{formatInr(item.mrp)}</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Standard cost</CardTitle>
              <CardDescription>Valuation basis for inventory.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="font-medium tabular-nums">
                {formatStandardCost(item.standard_cost, item.standard_cost_uom)}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
