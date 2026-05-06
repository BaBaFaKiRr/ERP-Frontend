'use client'

import { Fragment, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Check, ChevronsUpDown } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

type SalesOrderDetail = {
  id: string
  order_number: string
  status: string
  delivery_date?: string | null
  customers?: { name: string } | null
}

type PreviewLine = {
  sales_order_line_id: string
  item_id: string
  qty_ordered: number
  qty_booked: number
  qty_available_inventory: number
  balance_to_produce: number
  items?: { sku: string; name: string } | null
  work_orders_for_line: Array<{ id: string; wo_number: string; status: string }>
}

type HubPreview = {
  sales_order: SalesOrderDetail
  work_orders: Array<{ id: string; wo_number: string; status: string }>
  lines: PreviewLine[]
  hint?: string
}

type EnrichedBomTreeNode = {
  item_id: string
  sku: string | null
  name: string | null
  item_type: string | null
  qty_required: number
  qty_in_inventory: number
  qty_to_produce: number
  children: EnrichedBomTreeNode[]
}

type LinePreview = {
  sales_order_line: {
    id: string
    quantity: number
    sales_orders?: {
      id: string
      order_number: string
      delivery_date?: string | null
      customers?: { name: string } | null
    } | null
    items?: { id: string; sku: string; name: string } | null
  }
  explode_bom: boolean
  bom_tree: EnrichedBomTreeNode
}

function fmtWorkflowQty(n: number): string {
  const x = Number(n)
  if (!Number.isFinite(x)) return '—'
  const r = Math.round(x * 1000) / 1000
  if (Math.abs(r - Math.round(r)) < 1e-9) {
    return Math.round(r).toLocaleString('en-IN')
  }
  return r.toLocaleString('en-IN', { maximumFractionDigits: 3 })
}

function BomTreeRows({ nodes, depth }: { nodes: EnrichedBomTreeNode[]; depth: number }) {
  return (
    <>
      {nodes.map((n, i) => (
        <Fragment key={`${n.item_id}-${depth}-${i}`}>
          <TableRow>
            <TableCell
              className={cn('font-mono align-top', depth > 0 && 'text-muted-foreground')}
              style={{ paddingLeft: 12 + depth * 18 }}
            >
              {n.sku ?? '—'}
            </TableCell>
            <TableCell className="align-top" style={{ paddingLeft: 8 + depth * 12 }}>
              {n.name ?? '—'}
            </TableCell>
            <TableCell className="text-right tabular-nums">{fmtWorkflowQty(n.qty_required)}</TableCell>
            <TableCell className="text-right tabular-nums">{fmtWorkflowQty(n.qty_in_inventory)}</TableCell>
            <TableCell className="text-right tabular-nums font-medium">
              {fmtWorkflowQty(n.qty_to_produce)}
            </TableCell>
          </TableRow>
          {n.children.length > 0 ? <BomTreeRows nodes={n.children} depth={depth + 1} /> : null}
        </Fragment>
      ))}
    </>
  )
}

function GenerateWorkOrderPageContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const salesOrderId = typeof params.salesOrderId === 'string' ? params.salesOrderId : ''

  const [hub, setHub] = useState<HubPreview | null>(null)
  const [hubLoading, setHubLoading] = useState(true)
  const [hubError, setHubError] = useState<string | null>(null)

  const [lineOpen, setLineOpen] = useState(false)
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null)
  const [linePreview, setLinePreview] = useState<LinePreview | null>(null)
  const [lineLoading, setLineLoading] = useState(false)
  const [lineError, setLineError] = useState<string | null>(null)
  const [explodeBom, setExplodeBom] = useState(true)
  const [creating, setCreating] = useState(false)

  const loadHub = useCallback(async () => {
    if (!salesOrderId) return
    setHubLoading(true)
    setHubError(null)
    try {
      const previewRes = await erpFetch<{ data: HubPreview }>(
        `/api/work-orders/from-sales-order/${salesOrderId}/preview`,
      )
      setHub(previewRes.data ?? null)
    } catch (e) {
      setHubError(e instanceof Error ? e.message : 'Failed to load sales order')
      setHub(null)
    } finally {
      setHubLoading(false)
    }
  }, [salesOrderId])

  useEffect(() => {
    void loadHub()
  }, [loadHub])

  const stockLines = hub?.lines ?? []

  useEffect(() => {
    const q = searchParams.get('line')
    if (!q || stockLines.length === 0) return
    if (stockLines.some((l) => l.sales_order_line_id === q)) {
      setSelectedLineId(q)
    }
  }, [searchParams, stockLines])

  const loadLinePreview = useCallback(async (salesOrderLineId: string) => {
    setLineLoading(true)
    setLineError(null)
    try {
      const q = explodeBom ? '?explode=1' : ''
      const res = await erpFetch<{ data: LinePreview }>(
        `/api/work-orders/from-sales-order-line/${salesOrderLineId}/preview${q}`,
      )
      setLinePreview(res.data ?? null)
    } catch (e) {
      setLineError(e instanceof Error ? e.message : 'Failed to load BOM preview')
      setLinePreview(null)
    } finally {
      setLineLoading(false)
    }
  }, [explodeBom])

  useEffect(() => {
    if (!selectedLineId) {
      setLinePreview(null)
      return
    }
    void loadLinePreview(selectedLineId)
  }, [selectedLineId, loadLinePreview])

  const selectedLine = useMemo(
    () => stockLines.find((l) => l.sales_order_line_id === selectedLineId) ?? null,
    [stockLines, selectedLineId],
  )

  const createWorkOrder = async () => {
    if (!selectedLineId || !linePreview) return
    setCreating(true)
    try {
      const res = await erpFetch<{ data: { id: string } }>(
        `/api/work-orders/from-sales-order-line/${selectedLineId}`,
        {
          method: 'POST',
          body: JSON.stringify({ explode_bom: explodeBom }),
        },
      )
      router.push(`/dashboard/manufacturing/work-orders/${res.data.id}`)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to create work order')
    } finally {
      setCreating(false)
    }
  }

  if (hubLoading && !hub) {
    return <div className="p-8 text-muted-foreground">Loading…</div>
  }

  if (hubError || !hub) {
    return (
      <div className="p-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard/sales">
            <ArrowLeft className="mr-2 size-4" />
            Back to sales
          </Link>
        </Button>
        <p className="text-red-600">{hubError ?? 'Sales order not found'}</p>
      </div>
    )
  }

  const so = hub.sales_order

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/sales/${so.id}`} aria-label="Back">
              <ArrowLeft size={20} />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create work order</h1>
            <p className="text-gray-600 dark:text-muted-foreground mt-1">
              Order <span className="font-mono">{so.order_number}</span>
              {so.customers?.name ? ` · ${so.customers.name}` : ''}
            </p>
          </div>
        </div>
        <Button
          type="button"
          onClick={() => void createWorkOrder()}
          disabled={creating || !selectedLineId || !linePreview || lineLoading}
        >
          {creating ? 'Creating…' : 'Create work order'}
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Sales order line</CardTitle>
          <CardDescription>
            Search and select the finished / semi-finished item to manufacture for this order.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Item from this order</Label>
            <Popover open={lineOpen} onOpenChange={setLineOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  className="w-full max-w-xl justify-between"
                >
                  {selectedLine
                    ? `${selectedLine.items?.sku ?? '—'} — ${selectedLine.items?.name ?? 'Item'} (qty ${selectedLine.qty_ordered})`
                    : 'Search by SKU or name…'}
                  <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 max-w-xl" align="start">
                <Command>
                  <CommandInput placeholder="SKU or item name…" />
                  <CommandList>
                    <CommandEmpty>No stock lines on this order.</CommandEmpty>
                    <CommandGroup>
                      {stockLines.map((l) => {
                        const picked = selectedLineId === l.sales_order_line_id
                        const label = `${l.items?.sku ?? ''} ${l.items?.name ?? ''}`.trim()
                        return (
                          <CommandItem
                            key={l.sales_order_line_id}
                            value={label}
                            onSelect={() => {
                              setSelectedLineId(l.sales_order_line_id)
                              setLineOpen(false)
                              router.replace(
                                `/dashboard/manufacturing/work-orders/generate/${salesOrderId}?line=${l.sales_order_line_id}`,
                                { scroll: false },
                              )
                            }}
                          >
                            <Check className={cn('mr-2 size-4', picked ? 'opacity-100' : 'opacity-0')} />
                            <span className="font-mono">{l.items?.sku ?? '—'}</span>
                            <span className="text-muted-foreground ml-2">{l.items?.name}</span>
                            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                              ×{l.qty_ordered}
                            </span>
                          </CommandItem>
                        )
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-col gap-2 max-w-xl">
            <Label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={explodeBom}
                onChange={(e) => setExplodeBom(e.target.checked)}
              />
              <span>Explode multi-level BOM (show semi-finished breakdown)</span>
            </Label>
            <p className="text-xs text-muted-foreground">
              When checked, components under semi-finished parents appear nested under those parents.
            </p>
          </div>
        </CardContent>
      </Card>

      {lineError ? <p className="text-sm text-red-600 mb-4">{lineError}</p> : null}

      {selectedLineId && lineLoading && !linePreview ? (
        <p className="text-sm text-muted-foreground">Loading BOM…</p>
      ) : null}

      {linePreview?.bom_tree ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>BOM requirements</CardTitle>
            <CardDescription>
              Indented by level. <strong>Qty</strong> is required for this work order;{' '}
              <strong>Qty to produce / order</strong> is shortfall vs stock (informational).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>Item (SKU)</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Qty in stock</TableHead>
                    <TableHead className="text-right">Qty to produce / order</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-muted/25 font-medium">
                    <TableCell className="font-mono">{linePreview.bom_tree.sku ?? '—'}</TableCell>
                    <TableCell>{linePreview.bom_tree.name ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtWorkflowQty(linePreview.bom_tree.qty_required)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtWorkflowQty(linePreview.bom_tree.qty_in_inventory)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtWorkflowQty(linePreview.bom_tree.qty_to_produce)}
                    </TableCell>
                  </TableRow>
                  <BomTreeRows nodes={linePreview.bom_tree.children} depth={0} />
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : selectedLineId && !lineLoading ? (
        <p className="text-sm text-muted-foreground">Could not load BOM for this line.</p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Other lines on this order</CardTitle>
          <CardDescription>{hub.hint}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>SKU</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty ordered</TableHead>
                  <TableHead className="text-right">Balance to produce</TableHead>
                  <TableHead>Work orders</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockLines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground">
                      No stock lines.
                    </TableCell>
                  </TableRow>
                ) : (
                  stockLines.map((line) => (
                    <TableRow key={line.sales_order_line_id}>
                      <TableCell className="font-mono">{line.items?.sku ?? '—'}</TableCell>
                      <TableCell>{line.items?.name ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{line.qty_ordered}</TableCell>
                      <TableCell className="text-right tabular-nums">{line.balance_to_produce}</TableCell>
                      <TableCell>
                        {line.work_orders_for_line.length === 0 ? (
                          <span className="text-muted-foreground text-sm">—</span>
                        ) : (
                          <ul className="text-sm space-y-1">
                            {line.work_orders_for_line.map((w) => (
                              <li key={w.id}>
                                <Link
                                  className="text-primary hover:underline font-mono"
                                  href={`/dashboard/manufacturing/work-orders/${w.id}`}
                                >
                                  {w.wo_number}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {hub.work_orders.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>All work orders on this sales order</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {hub.work_orders.map((wo) => (
                <li key={wo.id}>
                  <Link
                    href={`/dashboard/manufacturing/work-orders/${wo.id}`}
                    className="font-mono text-primary hover:underline"
                  >
                    {wo.wo_number}
                  </Link>
                  <span className="text-muted-foreground text-sm ml-2">({wo.status})</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function GenerateWorkOrderPage() {
  return (
    <Suspense fallback={<div className="p-8 text-muted-foreground">Loading…</div>}>
      <GenerateWorkOrderPageContent />
    </Suspense>
  )
}
