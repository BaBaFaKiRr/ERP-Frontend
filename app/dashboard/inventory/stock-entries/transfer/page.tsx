'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRightLeft } from 'lucide-react'
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
import {
  ItemSearchField,
  type ItemSearchValue,
} from '@/components/inventory/item-search-field'
import { erpFetch } from '@/lib/erp-api'

type WarehouseOption = {
  id: string
  name: string
  is_default?: boolean
}

type LineDraft = {
  item: ItemSearchValue | null
  quantity: string
}

export default function StockTransferPage() {
  const router = useRouter()
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([])
  const [fromWarehouseId, setFromWarehouseId] = useState('')
  const [toWarehouseId, setToWarehouseId] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<LineDraft[]>([{ item: null, quantity: '' }])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    void erpFetch<{ data: WarehouseOption[] }>('/api/warehouses')
      .then((res) => {
        const rows = res.data ?? []
        setWarehouses(rows)
        const defaultWh = rows.find((w) => w.is_default) ?? rows[0]
        if (defaultWh) setFromWarehouseId(defaultWh.id)
      })
      .catch(() => setWarehouses([]))
  }, [])

  const updateLine = (index: number, patch: Partial<LineDraft>) => {
    setLines((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const addLine = () => setLines((prev) => [...prev, { item: null, quantity: '' }])
  const removeLine = (index: number) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fromWarehouseId || !toWarehouseId) {
      alert('Select source and destination warehouses')
      return
    }
    if (fromWarehouseId === toWarehouseId) {
      alert('Source and destination must differ')
      return
    }

    const parsedLines: { item_id: string; quantity: number }[] = []
    for (const row of lines) {
      if (!row.item && !row.quantity.trim()) continue
      if (!row.item || !row.quantity.trim()) {
        alert('Each line needs both item and quantity')
        return
      }
      const q = Number(row.quantity)
      if (Number.isNaN(q) || q <= 0) {
        alert('Quantities must be positive numbers')
        return
      }
      parsedLines.push({ item_id: row.item.id, quantity: q })
    }
    if (parsedLines.length === 0) {
      alert('Add at least one line')
      return
    }

    setSubmitting(true)
    try {
      await erpFetch('/api/stock-entries/transfer', {
        method: 'POST',
        body: {
          from_warehouse_id: fromWarehouseId,
          to_warehouse_id: toWarehouseId,
          lines: parsedLines,
          notes: notes.trim() || undefined,
        },
      })
      router.push('/dashboard/inventory/stock-entries')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Transfer failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/inventory/stock-entries" aria-label="Back">
            <ArrowLeft size={20} />
          </Link>
        </Button>
        <div>
          <h1 className="text-4xl font-bold">Warehouse transfer</h1>
          <p className="text-gray-600 mt-2">Move stock between warehouses without changing org-wide totals.</p>
        </div>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft size={22} />
                Transfer lines
              </CardTitle>
              <CardDescription>Each line moves quantity from source to destination.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {lines.map((row, index) => (
                <div key={index} className="rounded-lg border bg-muted/30 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                    <div className="md:col-span-8">
                      <ItemSearchField
                        id={`transfer-line-item-${index}`}
                        value={row.item}
                        onChange={(item) => updateLine(index, { item })}
                      />
                    </div>
                    <div className="md:col-span-3 space-y-1">
                      <span className="text-xs text-muted-foreground">Quantity</span>
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        value={row.quantity}
                        onChange={(e) => updateLine(index, { quantity: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-1 flex md:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeLine(index)}
                        disabled={lines.length <= 1}
                        className="md:mt-6"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              <Button type="button" variant="secondary" onClick={addLine}>
                Add line
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="xl:col-span-4">
          <Card className="xl:sticky xl:top-6">
            <CardHeader>
              <CardTitle>Warehouses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>From</Label>
                <Select value={fromWarehouseId} onValueChange={setFromWarehouseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Source warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>To</Label>
                <Select value={toWarehouseId} onValueChange={setToWarehouseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Destination warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? 'Transferring…' : 'Post transfer'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  )
}
