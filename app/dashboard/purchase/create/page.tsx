'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { erpFetch } from '@/lib/erp-api'
import { ArrowLeft, Plus, Search, Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Supplier {
  id: string
  supplier_code?: string | null
  name: string
  supplier_items?: Array<{
    item_id: string
    items?: { id: string; sku: string; name: string } | null
  }> | null
}

interface Item {
  id: string
  sku: string
  name: string
}

interface OrderItem {
  item_id: string
  qty_to_order: number
  unit_price: number
  qty_in_stock: number
}

type PurchaseOrderLine = {
  item_id: string
  quantity?: number | null
  unit_price?: number | null
}

type PurchaseOrder = {
  id: string
  status: string
  purchase_employee_name?: string | null
  supplier_id?: string | null
  delivery_profile_id?: string | null
  billing_profile_id?: string | null
  expected_delivery_date?: string | null
  notes?: string | null
  terms_profile_id?: string | null
  terms_text?: string | null
  created_at: string
  purchase_order_lines?: PurchaseOrderLine[] | null
}

type TermsProfile = {
  id: string
  alias: string
  is_default: boolean
  terms_text: string
}

type AddressProfile = {
  id: string
  profile_type: 'delivery' | 'billing'
  alias: string
  address_text: string
  is_default: boolean
}

export default function CreatePurchaseOrderPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const draftId = searchParams.get('draftId')
  const prefillItemId = searchParams.get('itemId')
  const prefillQty = Number(searchParams.get('qty') ?? '0')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [createdBy, setCreatedBy] = useState('')
  const [createdAt, setCreatedAt] = useState('')

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [termsProfiles, setTermsProfiles] = useState<TermsProfile[]>([])
  const [deliveryProfiles, setDeliveryProfiles] = useState<AddressProfile[]>([])
  const [billingProfiles, setBillingProfiles] = useState<AddressProfile[]>([])
  const [stockMap, setStockMap] = useState<Record<string, number>>({})
  const [lastPriceMap, setLastPriceMap] = useState<Record<string, number>>({})

  const [supplierSearch, setSupplierSearch] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState('')
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('')
  const [termsProfileId, setTermsProfileId] = useState('')
  const [deliveryProfileId, setDeliveryProfileId] = useState('')
  const [billingProfileId, setBillingProfileId] = useState('')
  const [notes, setNotes] = useState('')

  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [itemSearch, setItemSearch] = useState('')

  useEffect(() => {
    void initialize()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId])

  const initialize = async () => {
    setLoading(true)
    setError(null)
    try {
      const [meRes, suppliersRes, itemsRes, balancesRes, ordersRes, settingsRes, deliveryRes, billingRes] = await Promise.all([
        erpFetch<{ user: { firstName: string | null; lastName: string | null; email: string } }>('/api/me'),
        erpFetch<{ data: Supplier[] }>('/api/suppliers'),
        erpFetch<{ data: Item[] }>('/api/items?limit=500'),
        erpFetch<{ data: Array<{ item_id: string; qty_on_hand: number | null }> }>('/api/inventory/balances'),
        erpFetch<{ data: PurchaseOrder[] }>('/api/purchase/orders'),
        erpFetch<{ data: TermsProfile[] }>('/api/purchase-settings/terms'),
        erpFetch<{ data: AddressProfile[] }>('/api/purchase-settings/addresses?type=delivery'),
        erpFetch<{ data: AddressProfile[] }>('/api/purchase-settings/addresses?type=billing'),
      ])

      const name = `${meRes.user.firstName ?? ''} ${meRes.user.lastName ?? ''}`.trim() || meRes.user.email
      setCreatedBy(name)
      setCreatedAt(new Date().toLocaleString('en-IN'))
      setSuppliers(suppliersRes.data ?? [])
      setItems(itemsRes.data ?? [])

      const stocks = Object.fromEntries((balancesRes.data ?? []).map((row) => [row.item_id, Number(row.qty_on_hand ?? 0)]))
      setStockMap(stocks)

      const priceMap: Record<string, number> = {}
      for (const po of ordersRes.data ?? []) {
        for (const line of po.purchase_order_lines ?? []) {
          if (!line.item_id) continue
          if (priceMap[line.item_id] !== undefined) continue
          if (line.unit_price != null) {
            priceMap[line.item_id] = Number(line.unit_price)
          }
        }
      }
      setLastPriceMap(priceMap)

      const termsOnly = settingsRes.data ?? []
      setTermsProfiles(termsOnly)
      const defaultTerms = termsOnly.find((profile) => profile.is_default) ?? termsOnly[0]
      setTermsProfileId(defaultTerms?.id ?? '')
      const deliveries = deliveryRes.data ?? []
      const billings = billingRes.data ?? []
      setDeliveryProfiles(deliveries)
      setBillingProfiles(billings)
      setDeliveryProfileId((deliveries.find((p) => p.is_default) ?? deliveries[0])?.id ?? '')
      setBillingProfileId((billings.find((p) => p.is_default) ?? billings[0])?.id ?? '')

      if (draftId) {
        const draftRes = await erpFetch<{ data: PurchaseOrder }>(`/api/purchase/orders/${draftId}`)
        const draft = draftRes.data
        setSelectedSupplier(draft.supplier_id ?? '')
        setExpectedDeliveryDate(draft.expected_delivery_date ?? '')
        setNotes(draft.notes ?? '')
        if (draft.terms_profile_id) setTermsProfileId(draft.terms_profile_id)
        if (draft.delivery_profile_id) setDeliveryProfileId(draft.delivery_profile_id)
        if (draft.billing_profile_id) setBillingProfileId(draft.billing_profile_id)
        setCreatedBy(draft.purchase_employee_name ?? name)
        setCreatedAt(new Date(draft.created_at).toLocaleString('en-IN'))
        setOrderItems(
          (draft.purchase_order_lines ?? []).map((line) => ({
            item_id: line.item_id,
            qty_to_order: Number(line.quantity ?? 0),
            unit_price: Number(line.unit_price ?? priceMap[line.item_id] ?? 0),
            qty_in_stock: Number(stocks[line.item_id] ?? 0),
          })),
        )
      } else if (prefillItemId) {
        addItemToOrder(prefillItemId, Math.max(prefillQty, 1), stocks, priceMap)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load create purchase order data')
    } finally {
      setLoading(false)
    }
  }

  const selectedSupplierObject = useMemo(
    () => suppliers.find((supplier) => supplier.id === selectedSupplier) ?? null,
    [selectedSupplier, suppliers],
  )

  const supplierSuggestedItems = useMemo(() => {
    const linked = selectedSupplierObject?.supplier_items ?? []
    const ids = new Set(linked.map((entry) => entry.item_id))
    return items.filter((item) => ids.has(item.id))
  }, [items, selectedSupplierObject])

  const filteredSuppliers = useMemo(() => {
    const term = supplierSearch.trim().toLowerCase()
    if (!term) return suppliers
    return suppliers.filter((supplier) => {
      return (
        supplier.name.toLowerCase().includes(term) ||
        (supplier.supplier_code ?? '').toLowerCase().includes(term)
      )
    })
  }, [supplierSearch, suppliers])

  const filteredItems = useMemo(() => {
    const term = itemSearch.trim().toLowerCase()
    if (!term) return items
    return items.filter((item) => item.name.toLowerCase().includes(term) || item.sku.toLowerCase().includes(term))
  }, [itemSearch, items])

  const selectedTermsProfile = useMemo(
    () => termsProfiles.find((profile) => profile.id === termsProfileId) ?? null,
    [termsProfileId, termsProfiles],
  )
  const selectedDeliveryProfile = useMemo(
    () => deliveryProfiles.find((profile) => profile.id === deliveryProfileId) ?? null,
    [deliveryProfileId, deliveryProfiles],
  )
  const selectedBillingProfile = useMemo(
    () => billingProfiles.find((profile) => profile.id === billingProfileId) ?? null,
    [billingProfileId, billingProfiles],
  )

  const addItemToOrder = (
    itemId: string,
    qty = 0,
    stocks = stockMap,
    prices = lastPriceMap,
  ) => {
    if (!itemId) return
    const stockQty = Number(stocks[itemId] ?? 0)
    const unitPrice = Number(prices[itemId] ?? 0)
    setOrderItems((prev) => {
      const existing = prev.find((line) => line.item_id === itemId)
      if (existing) {
        return prev.map((line) =>
          line.item_id === itemId ? { ...line, qty_to_order: line.qty_to_order + qty } : line,
        )
      }
      return [...prev, { item_id: itemId, qty_to_order: qty, unit_price: unitPrice, qty_in_stock: stockQty }]
    })
  }

  const removeOrderItem = (itemId: string) => {
    setOrderItems((prev) => prev.filter((line) => line.item_id !== itemId))
  }

  const updateOrderItem = (itemId: string, patch: Partial<OrderItem>) => {
    setOrderItems((prev) => prev.map((line) => (line.item_id === itemId ? { ...line, ...patch } : line)))
  }

  const subTotal = useMemo(
    () => orderItems.reduce((sum, line) => sum + Number(line.qty_to_order) * Number(line.unit_price), 0),
    [orderItems],
  )
  const taxAmount = useMemo(() => Math.round(subTotal * 0.18 * 100) / 100, [subTotal])
  const grandTotal = useMemo(() => Math.round((subTotal + taxAmount) * 100) / 100, [subTotal, taxAmount])

  const buildPayload = (mode: 'draft' | 'generate') => {
    return {
      ...(draftId ? { id: draftId } : {}),
      supplier_id: selectedSupplier,
      expected_delivery_date: expectedDeliveryDate || undefined,
      notes: notes.trim() || undefined,
      purchase_employee_name: createdBy,
      terms_profile_id: termsProfileId || null,
      terms_text: selectedTermsProfile?.terms_text ?? null,
      delivery_profile_id: deliveryProfileId || null,
      delivery_address_text: selectedDeliveryProfile?.address_text ?? null,
      billing_profile_id: billingProfileId || null,
      billing_address_text: selectedBillingProfile?.address_text ?? null,
      mode,
      lines: orderItems.map((line) => ({
        item_id: line.item_id,
        quantity: Number(line.qty_to_order),
        unit_price: Number(line.unit_price),
      })),
    }
  }

  const submitOrder = async (mode: 'draft' | 'generate') => {
    if (!selectedSupplier) {
      setError('Please select a supplier.')
      return
    }
    if (orderItems.length === 0) {
      setError('Please add at least one order item.')
      return
    }
    if (!termsProfileId) {
      setError('Please select a Terms & Conditions profile.')
      return
    }
    if (!deliveryProfileId || !billingProfileId) {
      setError('Please select both Delivery and Billing address profiles.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const response = await erpFetch<{ data: { id: string } }>('/api/purchase/orders', {
        method: 'POST',
        body: buildPayload(mode),
      })

      if (mode === 'generate') {
        router.push(`/dashboard/purchase/orders/${response.data.id}/preview`)
        return
      }
      router.push('/dashboard/purchase/orders')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save purchase order')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading purchase order form...</div>
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard/purchase/orders">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft size={18} />
            Back
          </Button>
        </Link>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Create Purchase Order</h1>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Purchase Order Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Created by</label>
              <Input value={createdBy} disabled />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Created at</label>
              <Input value={createdAt} disabled />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Expected Delivery Date</label>
              <Input
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Supplier</CardTitle>
            <CardDescription>Search and select supplier</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input
                placeholder="Search supplier by name or code..."
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
              />
            </div>
            <div className="max-h-48 overflow-auto rounded-md border p-2">
              {filteredSuppliers.map((supplier) => (
                <button
                  type="button"
                  key={supplier.id}
                  onClick={() => setSelectedSupplier(supplier.id)}
                  className={`mb-1 w-full rounded px-3 py-2 text-left text-sm ${
                    selectedSupplier === supplier.id
                      ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100'
                      : 'hover:bg-muted'
                  }`}
                >
                  <span className="font-medium">{supplier.name}</span>
                  {supplier.supplier_code ? <span className="ml-2 text-xs">({supplier.supplier_code})</span> : null}
                </button>
              ))}
            </div>
            {selectedSupplierObject && (
              <div>
                <p className="text-sm font-medium mb-2">Items supplied by this supplier</p>
                {supplierSuggestedItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No linked supplier items found.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {supplierSuggestedItems.map((item) => (
                      <Badge
                        key={item.id}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => addItemToOrder(item.id)}
                      >
                        {item.sku} - {item.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order Items</CardTitle>
            <CardDescription>Search item and pick from matching results</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={16} />
              <Input
                className="pl-9"
                placeholder="Search item by SKU or name..."
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
              />
            </div>

            {itemSearch.trim().length > 0 && (
              <div className="max-h-56 overflow-auto rounded-md border p-2">
                {filteredItems.length === 0 ? (
                  <p className="px-2 py-1 text-sm text-muted-foreground">No matching items found.</p>
                ) : (
                  filteredItems.slice(0, 30).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="mb-1 w-full rounded px-3 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        setError(null)
                        addItemToOrder(item.id)
                        setItemSearch('')
                      }}
                    >
                      <span className="font-mono text-xs text-muted-foreground">{item.sku}</span>
                      <span className="ml-2 font-medium">{item.name}</span>
                    </button>
                  ))
                )}
              </div>
            )}

            {itemSearch.trim().length === 0 && (
              <p className="text-xs text-muted-foreground">
                Start typing SKU or item name to see matching results.
              </p>
            )}

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-slate-900/60">
                    <TableHead>SKU</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead className="text-right">Qty in Stock</TableHead>
                    <TableHead className="text-right">Qty to Order</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Total Price</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7}>No order items yet.</TableCell>
                    </TableRow>
                  ) : (
                    orderItems.map((line) => {
                      const item = items.find((row) => row.id === line.item_id)
                      return (
                        <TableRow key={line.item_id}>
                          <TableCell className="font-mono">{item?.sku ?? '-'}</TableCell>
                          <TableCell>{item?.name ?? '-'}</TableCell>
                          <TableCell className="text-right">{line.qty_in_stock}</TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min="1"
                              className="text-right"
                              value={line.qty_to_order === 0 ? '' : String(line.qty_to_order)}
                              onChange={(e) =>
                                updateOrderItem(line.item_id, {
                                  qty_to_order: e.target.value === '' ? 0 : Math.max(Number(e.target.value || 0), 0),
                                })
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              className="text-right"
                              value={line.unit_price === 0 ? '' : String(line.unit_price)}
                              onChange={(e) =>
                                updateOrderItem(line.item_id, {
                                  unit_price: e.target.value === '' ? 0 : Math.max(Number(e.target.value || 0), 0),
                                })
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            ₹{(Number(line.qty_to_order) * Number(line.unit_price)).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeOrderItem(line.item_id)}>
                              <Trash2 size={14} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="rounded-md border p-3 text-right">
              <p className="text-sm">Subtotal: ₹{subTotal.toFixed(2)}</p>
              <p className="text-sm">Tax (18%): ₹{taxAmount.toFixed(2)}</p>
              <p className="text-lg font-semibold">Grand Total: ₹{grandTotal.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profiles</CardTitle>
            <CardDescription>Select Terms, Delivery Address, and Billing Address profiles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Terms & Conditions Profile</label>
              <select
                value={termsProfileId}
                onChange={(e) => setTermsProfileId(e.target.value)}
                className="w-full rounded-md border px-3 py-2"
              >
                <option value="">Select terms profile</option>
                {termsProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.alias}
                    {profile.is_default ? ' (Default)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Delivery Address Profile</label>
              <select
                value={deliveryProfileId}
                onChange={(e) => setDeliveryProfileId(e.target.value)}
                className="w-full rounded-md border px-3 py-2"
              >
                <option value="">Select delivery address profile</option>
                {deliveryProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.alias}
                    {profile.is_default ? ' (Default)' : ''}
                  </option>
                ))}
              </select>
              <Textarea rows={3} value={selectedDeliveryProfile?.address_text ?? ''} readOnly className="mt-2" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Billing Address Profile</label>
              <select
                value={billingProfileId}
                onChange={(e) => setBillingProfileId(e.target.value)}
                className="w-full rounded-md border px-3 py-2"
              >
                <option value="">Select billing address profile</option>
                {billingProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.alias}
                    {profile.is_default ? ' (Default)' : ''}
                  </option>
                ))}
              </select>
              <Textarea rows={3} value={selectedBillingProfile?.address_text ?? ''} readOnly className="mt-2" />
            </div>
            <Textarea
              rows={5}
              value={selectedTermsProfile?.terms_text ?? ''}
              onChange={(e) => {
                const profile = termsProfiles.find((p) => p.id === termsProfileId)
                if (!profile) return
                setTermsProfiles((prev) =>
                  prev.map((p) => (p.id === profile.id ? { ...p, terms_text: e.target.value } : p)),
                )
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="outline" disabled={saving}>
                Save as Draft
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Save as draft?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will save the purchase order in draft status and keep it editable.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => void submitOrder('draft')}>
                  Confirm Save
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" disabled={saving}>
                Generate PO
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Generate purchase order?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will generate the PO, assign PO number, and open a preview in new tab.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => void submitOrder('generate')}>
                  Confirm Generate
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  )
}
