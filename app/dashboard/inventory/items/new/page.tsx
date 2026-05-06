'use client'

import { useEffect, useState } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, PackagePlus } from 'lucide-react'
import { FgCategorySearch } from '@/components/inventory/fg-category-search'
import { erpFetch } from '@/lib/erp-api'

const UOM_OPTIONS: { value: string; label: string }[] = [
  { value: 'pcs', label: 'pcs' },
  { value: 'kg', label: 'kg' },
  { value: 'g', label: 'g' },
  { value: 'ton', label: 'ton' },
  { value: 'm', label: 'm' },
  { value: 'cm', label: 'cm' },
  { value: 'l', label: 'l' },
  { value: 'ml', label: 'ml' },
  { value: 'sqm', label: 'sqm' },
  { value: 'box', label: 'box' },
  { value: 'dozen', label: 'dozen' },
  { value: 'pair', label: 'pair' },
  { value: 'set', label: 'set' },
  { value: 'bundle', label: 'bundle' },
  { value: 'roll', label: 'roll' },
  { value: 'sheet', label: 'sheet' },
]

const ITEM_TYPES: { value: string; label: string }[] = [
  { value: 'finished_good', label: 'Finished good' },
  { value: 'semi_finished', label: 'Semi-finished' },
  { value: 'raw_material', label: 'Raw material' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'service', label: 'Service' },
]

export default function CreateItemPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [sku, setSku] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [itemType, setItemType] = useState('finished_good')
  const [uom, setUom] = useState('pcs')
  const [standardCost, setStandardCost] = useState('')
  const [standardCostUom, setStandardCostUom] = useState('kg')
  const [hsn, setHsn] = useState('')
  const [costPerUnit, setCostPerUnit] = useState('')
  const [pricePerUnit, setPricePerUnit] = useState('')
  const [mrp, setMrp] = useState('')
  const [reserveQty, setReserveQty] = useState('0')
  const [reorderLevel, setReorderLevel] = useState('0')
  const [trackInventory, setTrackInventory] = useState(true)
  const [fgCategory, setFgCategory] = useState<string | null>(null)

  const isFinishedGood = itemType === 'finished_good'

  useEffect(() => {
    if (itemType === 'service') {
      setTrackInventory(false)
    } else {
      setTrackInventory(true)
    }
    if (itemType !== 'finished_good') {
      setFgCategory(null)
    }
  }, [itemType])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sku.trim() || !name.trim()) {
      alert('SKU and name are required')
      return
    }

    const body: Record<string, unknown> = {
      sku: sku.trim(),
      name: name.trim(),
      item_type: itemType,
      uom,
      reserve_quantity: Math.max(0, parseInt(reserveQty, 10) || 0),
      reorder_level: Math.max(0, parseInt(reorderLevel, 10) || 0),
      track_inventory: trackInventory,
    }
    if (description.trim()) {
      body.description = description.trim()
    }

    if (isFinishedGood) {
      if (!fgCategory) {
        alert('Search and select a category from the list')
        return
      }
      if (!hsn.trim()) {
        alert('HSN is required for finished goods')
        return
      }
      const cpu = Number(costPerUnit)
      const ppu = Number(pricePerUnit)
      const mrpN = Number(mrp)
      if (Number.isNaN(cpu) || cpu < 0) {
        alert('Cost per unit must be a valid non-negative number')
        return
      }
      if (Number.isNaN(ppu) || ppu < 0) {
        alert('Price per unit must be a valid non-negative number')
        return
      }
      if (Number.isNaN(mrpN) || mrpN < 0) {
        alert('MRP must be a valid non-negative number')
        return
      }
      body.fg_category = fgCategory
      body.hsn = hsn.trim()
      body.cost_per_unit = cpu
      body.price_per_unit = ppu
      body.mrp = mrpN
    } else {
      const costStr = standardCost.trim()
      if (costStr !== '') {
        const cost = Number(costStr)
        if (Number.isNaN(cost) || cost < 0) {
          alert('Standard cost must be a non-negative number')
          return
        }
        body.standard_cost = cost
        body.standard_cost_uom = standardCostUom
      }
    }

    setLoading(true)
    try {
      const res = await erpFetch<{ data: { id: string } }>('/api/items', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      if (res.data?.id) {
        router.push('/dashboard/inventory/items')
        return
      }
      alert('Unexpected response')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create item')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/inventory/items" aria-label="Back to items">
            <ArrowLeft size={20} />
          </Link>
        </Button>
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Create item</h1>
          <p className="text-gray-600 mt-2">Master data for stock, sales, and manufacturing.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackagePlus size={22} />
            Item details
          </CardTitle>
          <CardDescription>
            {isFinishedGood
              ? 'Finished goods require HSN and INR amounts per your stock unit of measure (below).'
              : 'Standard cost is in INR per the unit you choose (e.g. 100 INR per kg).'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. J300-043"
                className="font-mono"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Display name"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label>Item type</Label>
              <Select value={itemType} onValueChange={setItemType}>
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ITEM_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Unit of measure (stock)</Label>
              <Select value={uom} onValueChange={setUom}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UOM_OPTIONS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Cost, price, and MRP for finished goods are all per this unit.
              </p>
            </div>

            {isFinishedGood ? (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                <p className="text-sm font-medium">Finished good — category, HSN &amp; pricing (INR)</p>
                <FgCategorySearch value={fgCategory} onChange={setFgCategory} />
                <div className="grid gap-2">
                  <Label htmlFor="hsn">HSN</Label>
                  <Input
                    id="hsn"
                    value={hsn}
                    onChange={(e) => setHsn(e.target.value)}
                    placeholder="e.g. 8539"
                    className="font-mono max-w-xs"
                    required={isFinishedGood}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="cpu">Cost per unit</Label>
                    <Input
                      id="cpu"
                      type="number"
                      min={0}
                      step="any"
                      value={costPerUnit}
                      onChange={(e) => setCostPerUnit(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="ppu">Price per unit</Label>
                    <Input
                      id="ppu"
                      type="number"
                      min={0}
                      step="any"
                      value={pricePerUnit}
                      onChange={(e) => setPricePerUnit(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="mrp">MRP</Label>
                    <Input
                      id="mrp"
                      type="number"
                      min={0}
                      step="any"
                      value={mrp}
                      onChange={(e) => setMrp(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-2">
                <Label>Standard cost (optional)</Label>
                <p className="text-sm text-muted-foreground">
                  Valuation: amount in INR for one unit of measure below.
                </p>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">INR</span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      value={standardCost}
                      onChange={(e) => setStandardCost(e.target.value)}
                      placeholder="e.g. 100"
                      className="w-36"
                    />
                  </div>
                  <span className="pb-2 text-sm text-muted-foreground">per</span>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Unit</span>
                    <Select value={standardCostUom} onValueChange={setStandardCostUom}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UOM_OPTIONS.map((u) => (
                          <SelectItem key={u.value} value={u.value}>
                            {u.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="reserve">Reserve quantity</Label>
                <Input
                  id="reserve"
                  type="number"
                  min={0}
                  step={1}
                  value={reserveQty}
                  onChange={(e) => setReserveQty(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reorder">Reorder level</Label>
                <Input
                  id="reorder"
                  type="number"
                  min={0}
                  step={1}
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="track"
                checked={trackInventory}
                onCheckedChange={(c) => setTrackInventory(c === true)}
                disabled={itemType === 'service'}
              />
              <Label htmlFor="track" className="font-normal cursor-pointer">
                Track inventory (stock movements)
              </Label>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating…' : 'Create item'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/inventory/items">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
