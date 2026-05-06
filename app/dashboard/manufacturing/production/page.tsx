'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, ChevronsUpDown, Check, User2 } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

type Item = {
  id: string
  sku: string
  name: string
}

type Employee = {
  id: string
  employee_code?: string | null
  full_name?: string | null
}

type LineKind = 'production' | 'assembly'

type ProductionLine = {
  id: string
  name: string
  line_type?: LineKind | null
  line_status?: 'running' | 'resting'
  line_incharge?: Employee | null
  production_line_items?: Array<{ item_id: string; items?: Item | null }> | null
}

function normalizeLineKind(t: string | null | undefined): LineKind {
  return t === 'assembly' ? 'assembly' : 'production'
}

const LINE_KIND_LABEL: Record<LineKind, string> = {
  production: 'Production line',
  assembly: 'Assembly line',
}

/** Items API: only finished & semi-finished can be mapped as line output. */
const PRODUCES_ITEM_TYPES_QS = 'item_types=finished_good,semi_finished'

function LineCard({
  line,
  employeeDisplayName,
}: {
  line: ProductionLine
  employeeDisplayName: (employee?: Employee | null) => string
}) {
  const producedItems = line.production_line_items ?? []
  const kind = normalizeLineKind(line.line_type)
  return (
    <Link href={`/dashboard/manufacturing/production/${line.id}`}>
      <Card className="h-full border-border/70 bg-card/70 backdrop-blur-sm transition-colors hover:border-primary/40">
        <CardHeader className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-lg">{line.name}</CardTitle>
              <Badge variant="outline" className="text-[10px] font-normal">
                {LINE_KIND_LABEL[kind]}
              </Badge>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-xs">
              <span
                className={cn(
                  'inline-block h-2 w-2 rounded-full',
                  line.line_status === 'running' ? 'bg-green-500 animate-pulse' : 'bg-red-500',
                )}
              />
              <Badge
                variant={line.line_status === 'running' ? 'default' : 'destructive'}
                className="capitalize"
              >
                {line.line_status === 'running' ? 'Running' : 'Resting'}
              </Badge>
            </div>
          </div>
          <CardDescription className="flex items-center gap-2">
            <User2 size={14} />
            In-charge: {employeeDisplayName(line.line_incharge)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Produces</p>
            <div className="flex flex-wrap gap-1.5">
              {producedItems.length === 0 ? (
                <span className="text-sm text-muted-foreground">No mapped items</span>
              ) : (
                producedItems.slice(0, 4).map((entry) => (
                  <Badge key={entry.item_id} variant="secondary">
                    {entry.items?.sku ?? entry.items?.name ?? 'Item'}
                  </Badge>
                ))
              )}
              {producedItems.length > 4 && (
                <Badge variant="secondary">+{producedItems.length - 4} more</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export default function ProductionPage() {
  const [lines, setLines] = useState<ProductionLine[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openAdd, setOpenAdd] = useState(false)
  const [openItemsPicker, setOpenItemsPicker] = useState(false)
  const [openInchargePicker, setOpenInchargePicker] = useState(false)
  const [name, setName] = useState('')
  const [lineKind, setLineKind] = useState<LineKind>('production')
  const [lineInchargeId, setLineInchargeId] = useState('')
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])

  const selectedItems = useMemo(
    () => items.filter((item) => selectedItemIds.includes(item.id)),
    [items, selectedItemIds],
  )

  useEffect(() => {
    void load()
  }, [])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [linesRes, itemsRes, employeesRes] = await Promise.all([
        erpFetch<{ data: ProductionLine[] }>('/api/production-lines'),
        erpFetch<{ data: Item[] }>(`/api/items?limit=500&${PRODUCES_ITEM_TYPES_QS}`),
        erpFetch<{ data: Employee[] }>('/api/employees'),
      ])
      setLines(linesRes.data ?? [])
      setItems(itemsRes.data ?? [])
      setEmployees(employeesRes.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load production data')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setName('')
    setLineKind('production')
    setLineInchargeId('')
    setSelectedItemIds([])
  }

  const productionLines = useMemo(
    () => lines.filter((l) => normalizeLineKind(l.line_type) === 'production'),
    [lines],
  )
  const assemblyLines = useMemo(
    () => lines.filter((l) => normalizeLineKind(l.line_type) === 'assembly'),
    [lines],
  )

  const toggleItem = (itemId: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId],
    )
  }

  const employeeDisplayName = (employee?: Employee | null) => {
    if (!employee) return 'Unassigned'
    const code = employee.employee_code ?? '-'
    const name = employee.full_name?.trim() || 'Employee'
    return `${code} - ${name}`
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      alert('Please enter a line name')
      return
    }
    if (!lineInchargeId) {
      alert('Please select a line in-charge')
      return
    }
    if (selectedItemIds.length === 0) {
      alert('Please select at least one item in Produces')
      return
    }

    setSaving(true)
    try {
      await erpFetch('/api/production-lines', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          line_type: lineKind,
          line_incharge_id: lineInchargeId,
          item_ids: selectedItemIds,
        }),
      })
      await load()
      setOpenAdd(false)
      resetForm()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to create line')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Lines</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Production and assembly lines: monitor shifts, materials, and output.
          </p>
        </div>

        <Dialog
          open={openAdd}
          onOpenChange={(open) => {
            setOpenAdd(open)
            if (!open) resetForm()
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus size={16} />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add line</DialogTitle>
              <DialogDescription>
                Choose the line type, name, items it produces, and the in-charge.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="line-type">
                  Line type
                </label>
                <Select value={lineKind} onValueChange={(v) => setLineKind(v as LineKind)}>
                  <SelectTrigger id="line-type" className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="production">{LINE_KIND_LABEL.production}</SelectItem>
                    <SelectItem value="assembly">{LINE_KIND_LABEL.assembly}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Name</label>
                <Input
                  placeholder="Line 1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Produces</label>
                <p className="text-xs text-muted-foreground">
                  Finished goods and semi-finished items only.
                </p>
                <Popover open={openItemsPicker} onOpenChange={setOpenItemsPicker}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                    >
                      {selectedItems.length > 0
                        ? `${selectedItems.length} item${selectedItems.length === 1 ? '' : 's'} selected`
                        : 'Search finished / semi-finished items'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[420px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="SKU or name (finished & semi-finished)…" />
                      <CommandList>
                        <CommandEmpty>No items found.</CommandEmpty>
                        <CommandGroup>
                          {items.map((item) => {
                            const selected = selectedItemIds.includes(item.id)
                            return (
                              <CommandItem key={item.id} onSelect={() => toggleItem(item.id)}>
                                <Check className={cn('mr-2 h-4 w-4', selected ? 'opacity-100' : 'opacity-0')} />
                                {item.sku} - {item.name}
                              </CommandItem>
                            )
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {selectedItems.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedItems.map((item) => (
                      <Badge key={item.id} variant="secondary">
                        {item.sku}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Line in-charge</label>
                <Popover open={openInchargePicker} onOpenChange={setOpenInchargePicker}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                    >
                      {lineInchargeId
                        ? employeeDisplayName(employees.find((employee) => employee.id === lineInchargeId))
                        : 'Search by employee ID or name'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[420px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search by employee ID or name..." />
                      <CommandList>
                        <CommandEmpty>No employees found.</CommandEmpty>
                        <CommandGroup>
                          {employees.map((employee) => {
                            const selected = lineInchargeId === employee.id
                            const label = employeeDisplayName(employee)
                            return (
                              <CommandItem
                                key={employee.id}
                                value={`${employee.employee_code ?? ''} ${employee.full_name ?? ''}`}
                                onSelect={() => {
                                  setLineInchargeId(employee.id)
                                  setOpenInchargePicker(false)
                                }}
                              >
                                <Check className={cn('mr-2 h-4 w-4', selected ? 'opacity-100' : 'opacity-0')} />
                                {label}
                              </CommandItem>
                            )
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenAdd(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void handleCreate()} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading lines...</p>
      ) : lines.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>No lines yet</CardTitle>
            <CardDescription>Create your first production or assembly line using Add.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-10">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">Production Lines</h2>
            {productionLines.length === 0 ? (
              <p className="text-sm text-muted-foreground">No production lines yet.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {productionLines.map((line) => (
                  <LineCard
                    key={line.id}
                    line={line}
                    employeeDisplayName={employeeDisplayName}
                  />
                ))}
              </div>
            )}
          </section>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">Assembly Lines</h2>
            {assemblyLines.length === 0 ? (
              <p className="text-sm text-muted-foreground">No assembly lines yet.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {assemblyLines.map((line) => (
                  <LineCard
                    key={line.id}
                    line={line}
                    employeeDisplayName={employeeDisplayName}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
