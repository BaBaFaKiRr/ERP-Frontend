'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, ClipboardPlus } from 'lucide-react'
import {
  ItemSearchField,
  type ItemSearchValue,
} from '@/components/inventory/item-search-field'
import { erpFetch } from '@/lib/erp-api'

type LineDraft = {
  item: ItemSearchValue | null
  quantity: string
  direction: 'in' | 'out'
}

export default function CreateStockEntryPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [storeName, setStoreName] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<LineDraft[]>([
    { item: null, quantity: '', direction: 'in' },
  ])

  const updateLine = (index: number, patch: Partial<LineDraft>) => {
    setLines((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const addLine = () => {
    setLines((prev) => [...prev, { item: null, quantity: '', direction: 'in' }])
  }

  const removeLine = (index: number) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!storeName.trim()) {
      alert('Enter store / operator name')
      return
    }

    const parsedLines: { item_id: string; quantity: number; direction: 'in' | 'out' }[] = []
    for (const row of lines) {
      if (!row.item && !row.quantity.trim()) continue
      if (!row.item || !row.quantity.trim()) {
        alert('Each line needs both item and quantity, or clear empty lines')
        return
      }
      const q = Number(row.quantity)
      if (Number.isNaN(q) || q <= 0) {
        alert('Quantities must be positive numbers')
        return
      }
      parsedLines.push({
        item_id: row.item.id,
        quantity: q,
        direction: row.direction,
      })
    }

    if (parsedLines.length === 0) {
      alert('Add at least one line with item and quantity')
      return
    }

    setSubmitting(true)
    try {
      await erpFetch('/api/stock-entries/adjustment', {
        method: 'POST',
        body: JSON.stringify({
          store_employee_name: storeName.trim(),
          notes: notes.trim() || undefined,
          lines: parsedLines,
        }),
      })
      router.push('/dashboard/inventory/stock-entries')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to post stock entry')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/inventory/stock-entries" aria-label="Back to stock entries">
            <ArrowLeft size={20} />
          </Link>
        </Button>
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Create stock entry</h1>
          <p className="text-gray-600 mt-2">
            Adjustment entries apply to on-hand stock immediately (ledger + balances). Negative stock is
            blocked.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardPlus size={22} />
            Adjustment
          </CardTitle>
          <CardDescription>
            Use <strong>In</strong> to increase quantity and <strong>Out</strong> to decrease.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="store">Store / operator name</Label>
              <Input
                id="store"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Who is posting this entry"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Reason for adjustment, reference, etc."
              />
            </div>

            <div className="space-y-4">
              <div>
                <Label>Lines</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Search by SKU or name, select a row, then enter quantity and direction.
                </p>
              </div>

              {lines.map((row, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row gap-3 sm:items-start p-4 border rounded-lg bg-muted/30"
                >
                  <ItemSearchField
                    id={`stock-line-item-${index}`}
                    value={row.item}
                    onChange={(item) => updateLine(index, { item })}
                  />
                  <div className="w-full sm:w-32 space-y-1 shrink-0">
                    <span className="text-xs text-muted-foreground">Direction</span>
                    <Select
                      value={row.direction}
                      onValueChange={(v) =>
                        updateLine(index, { direction: v as 'in' | 'out' })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in">In (+)</SelectItem>
                        <SelectItem value="out">Out (−)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full sm:w-36 space-y-1 shrink-0">
                    <span className="text-xs text-muted-foreground">Quantity</span>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={row.quantity}
                      onChange={(e) => updateLine(index, { quantity: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeLine(index)}
                    disabled={lines.length <= 1}
                    className="shrink-0"
                  >
                    Remove
                  </Button>
                </div>
              ))}

              <Button type="button" variant="secondary" onClick={addLine}>
                Add line
              </Button>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Posting…' : 'Post stock entry'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/inventory/stock-entries">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
