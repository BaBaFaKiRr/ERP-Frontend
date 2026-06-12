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
import { ArrowLeft, PackagePlus, Settings2 } from 'lucide-react'
import { FgCategorySearch } from '@/components/inventory/fg-category-search'
import { erpFetch } from '@/lib/erp-api'

type ItemTypeOption = { code: string; name: string }
type UomOption = { code: string; name: string }

export default function CreateItemPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [mastersLoading, setMastersLoading] = useState(true)
  const [itemTypes, setItemTypes] = useState<ItemTypeOption[]>([])
  const [uomOptions, setUomOptions] = useState<UomOption[]>([])
  const [sku, setSku] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [itemType, setItemType] = useState('')
  const [uom, setUom] = useState('')
  const [standardCost, setStandardCost] = useState('')
  const [standardCostUom, setStandardCostUom] = useState('')
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
    let cancelled = false
    void (async () => {
      setMastersLoading(true)
      try {
        const [typesRes, uomRes] = await Promise.all([
          erpFetch<{ data: ItemTypeOption[] }>('/api/item-masters/item-types'),
          erpFetch<{ data: UomOption[] }>('/api/item-masters/units-of-measure'),
        ])
        if (cancelled) return
        const types = typesRes.data ?? []
        const uoms = uomRes.data ?? []
        setItemTypes(types)
        setUomOptions(uoms)
        if (types.length > 0) {
          const fg = types.find((t) => t.code === 'finished_good') ?? types[0]
          setItemType((prev) => prev || fg.code)
        }
        if (uoms.length > 0) {
          const pcs = uoms.find((u) => u.code === 'pcs') ?? uoms[0]
          setUom((prev) => prev || pcs.code)
          setStandardCostUom((prev) => prev || pcs.code)
        }
      } catch {
        if (!cancelled) {
          setItemTypes([])
          setUomOptions([])
        }
      } finally {
        if (!cancelled) setMastersLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

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
    if (!itemType || !uom) {
      alert('Item type and unit of measure are required')
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

    if (!hsn.trim()) {
      alert('HSN is required')
      return
    }
    body.hsn = hsn.trim()

    if (isFinishedGood) {
      if (!fgCategory) {
        alert('Search and select a category from the list')
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
        body.standard_cost_uom = standardCostUom || uom
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
    <div className="p-6 lg:p-8">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/inventory/items" aria-label="Back to items">
            <ArrowLeft size={20} />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">Create item</h1>
          <p className="text-muted-foreground mt-1">Master data for stock, sales, and manufacturing.</p>
        </div>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic information</CardTitle>
              <CardDescription>Identity and description for this item.</CardDescription>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
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
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="resize-y min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Classification</CardTitle>
              <CardDescription>Type, unit of measure, and tax code.</CardDescription>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Item type</Label>
                  <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
                    <Link href="/dashboard/inventory/settings/item-types">
                      <Settings2 className="size-3.5 mr-1" />
                      Configure
                    </Link>
                  </Button>
                </div>
                <Select value={itemType} onValueChange={setItemType} disabled={mastersLoading || itemTypes.length === 0}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={mastersLoading ? 'Loading…' : 'Select item type'} />
                  </SelectTrigger>
                  <SelectContent>
                    {itemTypes.map((t) => (
                      <SelectItem key={t.code} value={t.code}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Unit of measure (stock)</Label>
                  <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
                    <Link href="/dashboard/inventory/settings/units-of-measure">
                      <Settings2 className="size-3.5 mr-1" />
                      Configure
                    </Link>
                  </Button>
                </div>
                <Select value={uom} onValueChange={setUom} disabled={mastersLoading || uomOptions.length === 0}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={mastersLoading ? 'Loading…' : 'Select unit'} />
                  </SelectTrigger>
                  <SelectContent>
                    {uomOptions.map((u) => (
                      <SelectItem key={u.code} value={u.code}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isFinishedGood ? (
                  <p className="text-xs text-muted-foreground">
                    Cost, price, and MRP are per this unit.
                  </p>
                ) : null}
              </div>

              <div className="grid gap-2 sm:col-span-2 sm:max-w-xs">
                <Label htmlFor="hsn">HSN</Label>
                <Input
                  id="hsn"
                  value={hsn}
                  onChange={(e) => setHsn(e.target.value)}
                  placeholder="e.g. 8539"
                  className="font-mono"
                  required
                />
              </div>
            </CardContent>
          </Card>

          {isFinishedGood ? (
            <Card>
              <CardHeader>
                <CardTitle>Finished good pricing</CardTitle>
                <CardDescription>
                  Category and INR amounts per stock unit of measure.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FgCategorySearch value={fgCategory} onChange={setFgCategory} />
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
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Standard cost</CardTitle>
                <CardDescription>Optional valuation in INR per unit.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-3 items-end max-w-lg">
                  <div className="grid gap-2">
                    <Label htmlFor="standard-cost">Amount (INR)</Label>
                    <Input
                      id="standard-cost"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      value={standardCost}
                      onChange={(e) => setStandardCost(e.target.value)}
                      placeholder="e.g. 100"
                    />
                  </div>
                  <span className="pb-2 text-sm text-muted-foreground hidden sm:block">per</span>
                  <div className="grid gap-2">
                    <Label>Unit</Label>
                    <Select value={standardCostUom} onValueChange={setStandardCostUom}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {uomOptions.map((u) => (
                          <SelectItem key={u.code} value={u.code}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="xl:col-span-4 space-y-6">
          <Card className="xl:sticky xl:top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PackagePlus size={20} />
                Inventory settings
              </CardTitle>
              <CardDescription>Stock tracking and replenishment thresholds.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
              <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
                <Checkbox
                  id="track"
                  checked={trackInventory}
                  onCheckedChange={(c) => setTrackInventory(c === true)}
                  disabled={itemType === 'service'}
                  className="mt-0.5"
                />
                <div className="space-y-0.5">
                  <Label htmlFor="track" className="font-normal cursor-pointer leading-snug">
                    Track inventory
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Record stock movements for this item.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t">
                <Button type="submit" disabled={loading || mastersLoading} className="w-full">
                  {loading ? 'Creating…' : 'Create item'}
                </Button>
                <Button type="button" variant="outline" asChild className="w-full">
                  <Link href="/dashboard/inventory/items">Cancel</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  )
}
