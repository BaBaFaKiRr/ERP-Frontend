'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

import { erpFetch } from '@/lib/erp-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type ItemOption = {
  id: string
  sku: string
  name: string
  item_type: string
  uom: string
  cost_per_unit: number | null
  standard_cost: number | null
}

type Row = {
  selected: boolean
  component_item_id: string
  component_sku: string
  component_name: string
  quantity_per: string
  uom: string
  unit_cost: string
}

const UOMS = ['pcs', 'kg', 'g', 'ton', 'm', 'cm', 'l', 'ml', 'sqm', 'box', 'dozen', 'pair', 'set', 'bundle', 'roll', 'sheet']

export default function CreateBomPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [parentSearch, setParentSearch] = useState('')
  const [parentOptions, setParentOptions] = useState<ItemOption[]>([])
  const [showParentOptions, setShowParentOptions] = useState(false)
  const [materialSearch, setMaterialSearch] = useState('')
  const [materialOptions, setMaterialOptions] = useState<ItemOption[]>([])
  const [showMaterialOptions, setShowMaterialOptions] = useState(false)

  const [parentItemId, setParentItemId] = useState('')
  const [outputQuantity, setOutputQuantity] = useState('1')
  const [outputUom, setOutputUom] = useState('pcs')
  const [isDefault, setIsDefault] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [description, setDescription] = useState('')

  const [rows, setRows] = useState<Row[]>([])

  const selectedParent = useMemo(
    () => parentOptions.find((o) => o.id === parentItemId) ?? null,
    [parentItemId, parentOptions],
  )

  const totalAmount = useMemo(
    () =>
      rows.reduce((sum, row) => {
        const qty = Number(row.quantity_per || 0)
        const amt = Number(row.unit_cost || 0)
        return sum + qty * amt
      }, 0),
    [rows],
  )

  const searchParentItems = async (query: string) => {
    const res = await erpFetch<{ data: ItemOption[] }>(
      `/api/bom/search-items?scope=parent&search=${encodeURIComponent(query)}`,
    )
    setParentOptions(res.data ?? [])
  }

  const searchMaterialItems = async (query: string) => {
    const res = await erpFetch<{ data: ItemOption[] }>(
      `/api/bom/search-items?scope=component&search=${encodeURIComponent(query)}`,
    )
    setMaterialOptions(res.data ?? [])
  }

  const removeSelectedRows = () => {
    setRows((prev) => prev.filter((row) => !row.selected))
  }

  const setRow = (idx: number, patch: Partial<Row>) => {
    setRows((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)))
  }

  const onParentSearchChange = (value: string) => {
    setParentSearch(value)
    setShowParentOptions(true)
    if (value.trim().length < 1) {
      setParentOptions([])
      return
    }
    void searchParentItems(value)
  }

  const onMaterialSearchChange = (value: string) => {
    setMaterialSearch(value)
    setShowMaterialOptions(true)
    if (value.trim().length < 1) {
      setMaterialOptions([])
      return
    }
    void searchMaterialItems(value)
  }

  const addMaterialFromSearch = (item: ItemOption) => {
    setRows((prev) => {
      if (prev.some((r) => r.component_item_id === item.id)) return prev
      return [
        ...prev,
        {
          selected: false,
          component_item_id: item.id,
          component_sku: item.sku,
          component_name: item.name,
          quantity_per: '1',
          uom: item.uom || 'pcs',
          unit_cost: String(item.cost_per_unit ?? item.standard_cost ?? ''),
        },
      ]
    })
    setMaterialSearch('')
    setMaterialOptions([])
    setShowMaterialOptions(false)
  }

  const createBom = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const validRows = rows.filter((r) => r.component_item_id.trim().length > 0)
      if (!parentItemId) throw new Error('Please choose parent item')
      if (!validRows.length) throw new Error('Please add at least one raw material row')

      const parsedOutputQty = Number(outputQuantity)
      if (!Number.isFinite(parsedOutputQty) || parsedOutputQty <= 0) {
        throw new Error('BOM quantity must be greater than 0')
      }

      const payloadLines = validRows.map((row, idx) => {
        const qty = Number(row.quantity_per)
        if (!Number.isFinite(qty) || qty <= 0) {
          throw new Error(`Raw material row ${idx + 1}: quantity must be greater than 0`)
        }

        const amount = row.unit_cost === '' ? 0 : Number(row.unit_cost)
        if (!Number.isFinite(amount) || amount < 0) {
          throw new Error(`Raw material row ${idx + 1}: amount must be 0 or more`)
        }

        return {
          line_no: idx + 1,
          component_item_id: row.component_item_id,
          component_name: row.component_name.trim() || undefined,
          quantity_per: qty,
          uom: row.uom.trim() || undefined,
          unit_cost: amount,
        }
      })

      await erpFetch('/api/bom', {
        method: 'POST',
        body: {
          parent_item_id: parentItemId,
          output_quantity: parsedOutputQty,
          output_uom: outputUom,
          is_default: isDefault,
          is_active: isActive,
          description: description.trim() || undefined,
          lines: payloadLines,
        },
      })
      setSuccess('BOM created successfully.')
      setTimeout(() => {
        router.push('/dashboard/inventory/bom')
      }, 700)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create BOM')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Create BOM</h1>
          <p className="text-muted-foreground mt-1">Create Bill of Material for finished or semi-finished items.</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/inventory/bom">Back to BOM list</Link>
        </Button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? <p className="text-sm text-green-600">{success}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>BOM Header</CardTitle>
          <CardDescription>Define parent item and BOM settings.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label>Item</Label>
            <div className="relative">
              <Input
                value={parentSearch}
                onChange={(e) => onParentSearchChange(e.target.value)}
                onFocus={() => setShowParentOptions(true)}
                placeholder="Search finished/semi-finished by SKU or name"
              />
              {showParentOptions && parentSearch.trim().length > 0 ? (
                <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-background shadow">
                  {parentOptions.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-muted-foreground">No items found</p>
                  ) : (
                    parentOptions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => {
                          setParentItemId(item.id)
                          setParentSearch(`${item.sku} - ${item.name}`)
                          setShowParentOptions(false)
                        }}
                      >
                        {item.sku} - {item.name}
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>
            {selectedParent ? (
              <p className="text-xs text-muted-foreground">Selected: {selectedParent.sku} - {selectedParent.name}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input type="number" min="0.001" step="0.001" value={outputQuantity} onChange={(e) => setOutputQuantity(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Metric</Label>
            <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={outputUom} onChange={(e) => setOutputUom(e.target.value)}>
              {UOMS.map((uom) => (
                <option key={uom} value={uom}>
                  {uom}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={isActive ? 'active' : 'inactive'}
              onChange={(e) => setIsActive(e.target.value === 'active')}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>Set as default</Label>
            <div className="flex items-center gap-2 h-10 rounded-md border px-3">
              <Checkbox checked={isDefault} onCheckedChange={(v) => setIsDefault(Boolean(v))} />
              <span className="text-sm">Use this as default active BOM</span>
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>BOM description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Raw Materials</CardTitle>
          <CardDescription>Select raw materials and define quantities/UOM/cost.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Input
              value={materialSearch}
              onChange={(e) => onMaterialSearchChange(e.target.value)}
              onFocus={() => setShowMaterialOptions(true)}
              placeholder="Search raw material by item code or name and select to add"
            />
            {showMaterialOptions && materialSearch.trim().length > 0 ? (
              <div className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-background shadow-lg">
                {materialOptions.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">No items found</p>
                ) : (
                  materialOptions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => addMaterialFromSearch(item)}
                    >
                      {item.sku} - {item.name}
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={removeSelectedRows}>
              <Trash2 size={14} className="mr-1" />
              Remove Selected
            </Button>
          </div>

          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">Select</TableHead>
                  <TableHead className="w-12">Sno.</TableHead>
                  <TableHead>Item Code</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead className="text-right">Amount (INR)</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8}>No raw materials added yet. Search above and select an item.</TableCell>
                  </TableRow>
                ) : (
                  rows.map((row, idx) => {
                    const lineTotal = Number(row.quantity_per || 0) * Number(row.unit_cost || 0)
                    return (
                      <TableRow key={idx}>
                        <TableCell>
                          <Checkbox checked={row.selected} onCheckedChange={(v) => setRow(idx, { selected: Boolean(v) })} />
                        </TableCell>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>{row.component_sku || '-'}</TableCell>
                        <TableCell>
                          <Input
                            value={row.component_name}
                            onChange={(e) => setRow(idx, { component_name: e.target.value })}
                            placeholder="Item name"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0.001"
                            step="0.001"
                            value={row.quantity_per}
                            onChange={(e) => setRow(idx, { quantity_per: e.target.value })}
                          />
                        </TableCell>
                        <TableCell>
                          <select
                            className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                            value={row.uom}
                            onChange={(e) => setRow(idx, { uom: e.target.value })}
                          >
                            <option value="">Select UOM</option>
                            {UOMS.map((uom) => (
                              <option key={uom} value={uom}>
                                {uom}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell>
                          <Input
                            className="text-right"
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.unit_cost}
                            onChange={(e) => setRow(idx, { unit_cost: e.target.value })}
                            placeholder="Amount"
                          />
                        </TableCell>
                        <TableCell className="text-right">₹{lineTotal.toFixed(2)}</TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
          </Table>

          <div className="flex justify-end">
            <p className="text-sm font-medium">Total Amount: ₹{totalAmount.toFixed(2)}</p>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => void createBom()} disabled={saving}>
              {saving ? 'Creating...' : 'Create BOM'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
