'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowLeft, Loader2, Search, UserPlus, X } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { cn } from '@/lib/utils'

const GST_RATE = 0.18

/** Local calendar start-of-day */
function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function toLocalYmd(d: Date): string {
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${day}`
}

function todayLocalYmd(): string {
  return toLocalYmd(startOfLocalDay(new Date()))
}

function orderDateBounds(): { min: string; max: string } {
  const today = startOfLocalDay(new Date())
  const min = new Date(today)
  min.setDate(min.getDate() - 7)
  return { min: toLocalYmd(min), max: toLocalYmd(today) }
}

function isOrderDateAllowed(ymd: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim())
  if (!m) return false
  const y = Number(m[1])
  const mo = Number(m[2]) - 1
  const d = Number(m[3])
  const chosen = new Date(y, mo, d)
  if (chosen.getFullYear() !== y || chosen.getMonth() !== mo || chosen.getDate() !== d) return false
  const { min, max } = orderDateBounds()
  const c = toLocalYmd(startOfLocalDay(chosen))
  return c >= min && c <= max
}

type CustomerPick = {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  gst_number?: string | null
}

interface ItemRow {
  id: string
  sku: string
  name: string
  item_type: string
  uom?: string | null
  hsn?: string | null
  price_per_unit?: number | null
  mrp?: number | null
  standard_cost?: number | null
  standard_cost_uom?: string | null
}

type OrderLineRow = {
  item_id: string
  sku: string
  name: string
  hsn: string | null
  /** Immutable: from items.price_per_unit */
  stock_price: number | null
  mrp: number | null
  uom: string | null
  /** Controlled as string so the field can be empty while typing */
  quantity: string
  /** Selling price per unit (editable) */
  unit_price: string
  line_kind: 'stock' | 'service'
}

function lineKindFromItemType(itemType: string): 'stock' | 'service' {
  return itemType === 'service' ? 'service' : 'stock'
}

function formatInr(n: number | null) {
  if (n == null || Number.isNaN(n)) return '—'
  return `₹${Number(n).toFixed(2)}`
}

function parseLineAmounts(line: OrderLineRow): { qty: number; price: number; lineTotal: number } {
  const qty = parseFloat(line.quantity)
  const price = parseFloat(line.unit_price)
  const qOk = Number.isFinite(qty) && qty > 0
  const pOk = Number.isFinite(price) && price >= 0
  if (!qOk || !pOk) {
    return { qty: 0, price: 0, lineTotal: 0 }
  }
  const lineTotal = Math.round(qty * price * 100) / 100
  return { qty, price, lineTotal }
}

function CreateSalesOrderForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [pickedCustomer, setPickedCustomer] = useState<CustomerPick | null>(null)
  const [customerQuery, setCustomerQuery] = useState('')
  const [customerResults, setCustomerResults] = useState<CustomerPick[]>([])
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false)
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false)
  const customerWrapRef = useRef<HTMLDivElement>(null)
  const [orderDate, setOrderDate] = useState(() => todayLocalYmd())
  const [deliveryDate, setDeliveryDate] = useState('')
  const [poNumber, setPoNumber] = useState('')
  const [poFile, setPoFile] = useState<File | null>(null)
  const [lines, setLines] = useState<OrderLineRow[]>([])
  const { min: orderDateMin, max: orderDateMax } = orderDateBounds()

  const [itemQuery, setItemQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ItemRow[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [pickedItem, setPickedItem] = useState<ItemRow | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const searchWrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const id = searchParams.get('customerId')
    if (!id) return
    void (async () => {
      try {
        const cRes = await erpFetch<{ data: CustomerPick }>(`/api/customers/${id}`)
        const c = cRes.data
        if (c?.id) {
          setPickedCustomer(c)
          setCustomerQuery(c.name)
        }
      } catch {
        /* ignore invalid / missing id */
      }
    })()
  }, [searchParams])

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const t = e.target as Node
      if (!searchWrapRef.current?.contains(t)) setSearchOpen(false)
      if (!customerWrapRef.current?.contains(t)) setCustomerSearchOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [])

  const runCustomerSearch = useCallback((search: string, limit: number) => {
    void (async () => {
      setCustomerSearchLoading(true)
      try {
        const q = search.trim()
        const suffix =
          q.length > 0
            ? `?search=${encodeURIComponent(q)}&limit=${limit}`
            : `?limit=${limit}`
        const res = await erpFetch<{ data: CustomerPick[] }>(`/api/customers${suffix}`)
        setCustomerResults(res.data ?? [])
        setCustomerSearchOpen(true)
      } catch {
        setCustomerResults([])
      } finally {
        setCustomerSearchLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    if (pickedCustomer) {
      setCustomerSearchOpen(false)
      return
    }
    const q = customerQuery.trim()
    if (q.length === 0) {
      setCustomerResults([])
      setCustomerSearchOpen(false)
      return
    }
    const t = setTimeout(() => runCustomerSearch(q, 40), 280)
    return () => clearTimeout(t)
  }, [customerQuery, pickedCustomer, runCustomerSearch])

  useEffect(() => {
    const q = itemQuery.trim()
    if (q.length < 1) {
      setSearchResults([])
      setSearchOpen(false)
      return
    }
    const t = setTimeout(() => {
      void (async () => {
        setSearchLoading(true)
        try {
          const res = await erpFetch<{ data: ItemRow[] }>(
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
  }, [itemQuery])

  const onItemQueryChange = (v: string) => {
    setItemQuery(v)
    setPickedItem(null)
  }

  const onCustomerQueryChange = (v: string) => {
    setCustomerQuery(v)
    setPickedCustomer(null)
  }

  const selectCustomer = (c: CustomerPick) => {
    setPickedCustomer(c)
    setCustomerQuery(c.name)
    setCustomerResults([])
    setCustomerSearchOpen(false)
  }

  const clearCustomer = () => {
    setPickedCustomer(null)
    setCustomerQuery('')
    setCustomerResults([])
    setCustomerSearchOpen(false)
  }

  const selectSearchItem = (item: ItemRow) => {
    setPickedItem(item)
    setItemQuery(`${item.sku} — ${item.name}`)
    setSearchResults([])
    setSearchOpen(false)
  }

  const handleAdd = () => {
    if (!pickedItem) {
      alert('Search and select an item from the list first')
      return
    }
    const listPrice = pickedItem.price_per_unit != null ? Number(pickedItem.price_per_unit) : null
    const fallback =
      pickedItem.standard_cost != null ? Number(pickedItem.standard_cost) : null
    const defaultSell = listPrice ?? fallback
    const row: OrderLineRow = {
      item_id: pickedItem.id,
      sku: pickedItem.sku,
      name: pickedItem.name,
      hsn: pickedItem.hsn?.trim() ? pickedItem.hsn.trim() : null,
      stock_price: listPrice,
      mrp: pickedItem.mrp != null ? Number(pickedItem.mrp) : null,
      uom: pickedItem.uom ?? null,
      quantity: '',
      unit_price: defaultSell != null ? String(defaultSell) : '',
      line_kind: lineKindFromItemType(pickedItem.item_type),
    }
    setLines((prev) => [...prev, row])
    setPickedItem(null)
    setItemQuery('')
  }

  const updateLine = (index: number, patch: Partial<Pick<OrderLineRow, 'quantity' | 'unit_price'>>) => {
    setLines((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row
        return { ...row, ...patch }
      }),
    )
  }

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index))
  }

  const { subtotal, gstAmount, grandTotal } = useMemo(() => {
    const sub = lines.reduce((s, l) => s + parseLineAmounts(l).lineTotal, 0)
    const gst = Math.round(sub * GST_RATE * 100) / 100
    const grand = Math.round((sub + gst) * 100) / 100
    return { subtotal: sub, gstAmount: gst, grandTotal: grand }
  }, [lines])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!pickedCustomer?.id || lines.length === 0) {
      alert('Search and select a customer, and add at least one line')
      return
    }
    if (poFile && !poNumber.trim()) {
      alert('PO number is required when you upload a purchase order file')
      return
    }

    if (!isOrderDateAllowed(orderDate)) {
      alert('Order date must be today or up to 7 days in the past, and not in the future.')
      return
    }

    const payloadLines: {
      item_id: string
      line_kind: 'stock' | 'service'
      quantity: number
      unit_price: number
    }[] = []

    for (const l of lines) {
      const { qty, price } = parseLineAmounts(l)
      if (qty <= 0 || !Number.isFinite(qty)) {
        alert('Each line needs a valid quantity greater than zero')
        return
      }
      if (!Number.isFinite(price) || price < 0) {
        alert('Each line needs a valid price (zero or positive)')
        return
      }
      payloadLines.push({
        item_id: l.item_id,
        line_kind: l.line_kind,
        quantity: qty,
        unit_price: price,
      })
    }

    setLoading(true)

    try {
      const created = await erpFetch<{ data: { id: string } }>('/api/sales-orders', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: pickedCustomer.id,
          order_date: orderDate,
          delivery_date: deliveryDate || undefined,
          lines: payloadLines,
        }),
      })

      if (poFile && created?.data?.id) {
        const form = new FormData()
        form.append('po_number', poNumber.trim())
        form.append('po_file', poFile)
        await erpFetch(`/api/sales-orders/${created.data.id}/purchase-order`, {
          method: 'POST',
          body: form,
        })
      }

      router.push('/dashboard/sales')
    } catch (error) {
      console.error('Error creating order:', error)
      alert(error instanceof Error ? error.message : 'Failed to create sales order')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="sm" asChild className="gap-2">
          <Link href="/dashboard/sales">
            <ArrowLeft size={18} />
            Back
          </Link>
        </Button>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Create Sales Order</h1>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Order details</CardTitle>
            <CardDescription>
              Order numbers are generated on the server (e.g. SL-2026-00001).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="order-date" className="mb-1 block">
                  Order date *
                </Label>
                <Input
                  id="order-date"
                  type="date"
                  required
                  value={orderDate}
                  min={orderDateMin}
                  max={orderDateMax}
                  onChange={(e) => {
                    const v = e.target.value
                    if (!v) {
                      setOrderDate(todayLocalYmd())
                      return
                    }
                    setOrderDate(v)
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Defaults to today. Allowed range: {orderDateMin} to {orderDateMax} (not more than 7 days ago, not
                  future).
                </p>
              </div>
              <div>
                <Label htmlFor="delivery-date" className="mb-1 block">
                  Delivery date
                </Label>
                <Input
                  id="delivery-date"
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="po-number" className="mb-1 block">
                  Purchase Order Number (optional)
                </Label>
                <Input
                  id="po-number"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  placeholder="Enter PO number if uploading PO"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="po-file" className="mb-1 block">
                  Upload Purchase Order (optional)
                </Label>
                <Input
                  id="po-file"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={(e) => setPoFile(e.target.files?.[0] ?? null)}
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  If PO file is uploaded, PO number is required.
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="customer-search" className="mb-1 block">
                Customer *
              </Label>
              <div className="flex flex-col sm:flex-row gap-2 sm:items-start">
                <div className="relative flex-1 min-w-0" ref={customerWrapRef}>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="customer-search"
                    value={customerQuery}
                    onChange={(e) => onCustomerQueryChange(e.target.value)}
                    onFocus={() => {
                      if (pickedCustomer) return
                      if (customerQuery.trim() === '') {
                        runCustomerSearch('', 30)
                      } else {
                        setCustomerSearchOpen(true)
                      }
                    }}
                    placeholder="Search by name, email, phone, or GST…"
                    className="pl-9 pr-9"
                    autoComplete="off"
                    aria-autocomplete="list"
                    aria-expanded={customerSearchOpen}
                    aria-controls="customer-search-results"
                  />
                  {pickedCustomer ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 size-8 text-muted-foreground"
                      onClick={() => clearCustomer()}
                      aria-label="Clear customer"
                    >
                      <X className="size-4" />
                    </Button>
                  ) : customerSearchLoading ? (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
                  ) : null}
                  {customerSearchOpen && customerResults.length > 0 && !pickedCustomer && (
                    <ul
                      id="customer-search-results"
                      className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md"
                      role="listbox"
                    >
                      {customerResults.map((c) => (
                        <li key={c.id} role="option">
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => selectCustomer(c)}
                          >
                            <span className="font-medium">{c.name}</span>
                            {(c.email?.trim() || c.phone?.trim()) && (
                              <span className="block text-xs text-muted-foreground mt-0.5">
                                {[c.email, c.phone].filter(Boolean).join(' · ')}
                              </span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {customerSearchOpen &&
                    !customerSearchLoading &&
                    !pickedCustomer &&
                    customerResults.length === 0 &&
                    customerQuery.trim().length > 0 && (
                      <p className="absolute z-50 mt-1 w-full rounded-md border bg-popover px-3 py-2 text-sm text-muted-foreground shadow-md">
                        No customers match. Try another search or add a new customer.
                      </p>
                    )}
                </div>
                <Button type="button" variant="outline" asChild className="shrink-0 gap-2 w-full sm:w-auto">
                  <Link href="/dashboard/sales/customers/new">
                    <UserPlus size={18} />
                    Add customer
                  </Link>
                </Button>
              </div>
              {pickedCustomer && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  Selected customer ·{' '}
                  {pickedCustomer.gst_number?.trim() ? `GST ${pickedCustomer.gst_number}` : 'No GST on file'}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lines</CardTitle>
            <CardDescription>
              Search by SKU or name, select a row, then <strong>Add</strong>. Stock price and MRP come from
              the item master. Enter quantity and selling price per line.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col lg:flex-row gap-3 lg:items-end">
              <div className="flex-1 space-y-2 min-w-0">
                <Label htmlFor="item-search">Item</Label>
                <div className="relative" ref={searchWrapRef}>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="item-search"
                    value={itemQuery}
                    onChange={(e) => onItemQueryChange(e.target.value)}
                    onFocus={() => itemQuery.trim().length >= 1 && setSearchOpen(true)}
                    placeholder="Type SKU or name to search…"
                    className="pl-9"
                    autoComplete="off"
                  />
                  {searchLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
                  )}
                  {searchOpen && searchResults.length > 0 && !pickedItem && (
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
                    !pickedItem && (
                      <p className="absolute z-50 mt-1 w-full rounded-md border bg-popover px-3 py-2 text-sm text-muted-foreground shadow-md">
                        No items match. Try another search.
                      </p>
                    )}
                </div>
                {pickedItem && (
                  <p className="text-xs text-muted-foreground">
                    Selected: <strong>{pickedItem.sku}</strong> — {pickedItem.name}
                  </p>
                )}
              </div>
              <Button type="button" onClick={handleAdd} className="shrink-0 w-full lg:w-auto">
                Add
              </Button>
            </div>

            {lines.length > 0 && (
              <div className="space-y-4 border-t pt-4">
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-mono text-xs">HSN</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="w-[88px]">Qty</TableHead>
                        <TableHead className="min-w-[100px]">Price</TableHead>
                        <TableHead className="min-w-[110px]">Stock price</TableHead>
                        <TableHead className="min-w-[90px]">MRP</TableHead>
                        <TableHead className="text-right min-w-[100px]">Total</TableHead>
                        <TableHead className="w-[52px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((line, index) => {
                        const { lineTotal } = parseLineAmounts(line)
                        return (
                          <TableRow key={`${line.item_id}-${index}`}>
                            <TableCell className="font-mono text-xs whitespace-nowrap">
                              {line.hsn ?? '—'}
                            </TableCell>
                            <TableCell className="font-mono text-sm">{line.sku}</TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                inputMode="decimal"
                                className="h-8 w-[4.5rem] font-mono"
                                value={line.quantity}
                                onChange={(e) => updateLine(index, { quantity: e.target.value })}
                                placeholder="Qty"
                                aria-label="Quantity"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                inputMode="decimal"
                                className="h-8 w-24 tabular-nums"
                                value={line.unit_price}
                                onChange={(e) => updateLine(index, { unit_price: e.target.value })}
                                placeholder="0"
                                aria-label="Price per unit"
                              />
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm tabular-nums whitespace-nowrap">
                              {formatInr(line.stock_price)}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm tabular-nums whitespace-nowrap">
                              {formatInr(line.mrp)}
                            </TableCell>
                            <TableCell className="text-right font-medium tabular-nums">
                              {lineTotal > 0 ? lineTotal.toFixed(2) : '—'}
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8 text-destructive hover:text-destructive"
                                onClick={() => removeLine(index)}
                                aria-label="Remove line"
                              >
                                <X className="size-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex flex-col items-end gap-2 border-t pt-4 text-sm">
                  <div className="flex w-full max-w-sm justify-between gap-8">
                    <span className="text-muted-foreground">Subtotal (ex GST)</span>
                    <span className="tabular-nums font-medium">₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex w-full max-w-sm justify-between gap-8">
                    <span className="text-muted-foreground">GST (18%)</span>
                    <span className="tabular-nums font-medium">₹{gstAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex w-full max-w-sm justify-between gap-8 text-base border-t pt-2">
                    <span className="font-semibold">Total (incl. GST)</span>
                    <span className="tabular-nums font-bold">₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard/sales">Cancel</Link>
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating…' : 'Create sales order'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default function CreateSalesOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-muted-foreground">Loading create sales order…</div>
      }
    >
      <CreateSalesOrderForm />
    </Suspense>
  )
}
