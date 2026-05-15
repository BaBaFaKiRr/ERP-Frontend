'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type PurchaseOrderLine = {
  item_id: string
  quantity?: number | null
  unit_price?: number | null
  items?: { id: string; sku: string; name: string } | null
}

type PurchaseOrder = {
  id: string
  po_number?: string | null
  status: string
  supplier_id?: string | null
  suppliers?: { id?: string | null; supplier_code?: string | null; name?: string | null } | null
  purchase_order_lines?: PurchaseOrderLine[] | null
  purchase_receipts?: Array<{
    id: string
    status?: string | null
    purchase_receipt_lines?: Array<{ item_id?: string | null; quantity?: number | null }> | null
  }> | null
}

type ReceiptItem = {
  item_id: string
  qty_received: number
  unit_price: number
}

type PoDiscrepancyRow = {
  item_id: string
  sku: string
  item_name: string
  po_unit_price: number
  seller_invoice_unit_price: string
  po_quantity: number
  seller_invoice_quantity: string
  quantity_received: string
  rejection_quantity: string
}

type ItemMismatchRow = {
  key: string
  sku: string
  item_name: string
  quantity_received: string
  seller_invoice_unit_price: string
}

type DiscrepancyPayload = {
  issue_type: 'price_mismatch' | 'qty_mismatch' | 'item_mismatch' | 'quality_issue' | 'other'
  item_id?: string | null
  sku?: string | null
  item_name?: string | null
  po_unit_price?: number | null
  seller_invoice_unit_price?: number | null
  po_quantity?: number | null
  seller_invoice_quantity?: number | null
  quantity_received?: number | null
  rejection_quantity?: number | null
  notes?: string | null
}

type ReceiptDiscrepancy = DiscrepancyPayload & {
  id?: string
  items?: { id?: string | null; sku?: string | null; name?: string | null } | null
}

type PurchaseReceiptDetail = {
  id: string
  pr_number?: string | null
  status?: string | null
  payment_status?: string | null
  supplier_id?: string | null
  purchase_order_id?: string | null
  received_at?: string | null
  seller_sales_invoice_number?: string | null
  uploaded_by_name?: string | null
  uploaded_at?: string | null
  total_amount?: number | null
  freight_charges?: number | null
  freight_paid_by?: string | null
  is_item_paid?: boolean | null
  amount_paid?: number | null
  notes?: string | null
  purchase_orders?: { id: string; po_number?: string | null } | null
  purchase_receipt_lines?: Array<{
    item_id?: string | null
    quantity?: number | null
    unit_price?: number | null
    items?: { id?: string | null; sku?: string | null; name?: string | null } | null
  }> | null
  purchase_receipt_discrepancies?: ReceiptDiscrepancy[] | null
}

type PurchaseReceiptFormProps = {
  mode: 'create' | 'edit'
  receiptId?: string
}

export function PurchaseReceiptForm({ mode, receiptId }: PurchaseReceiptFormProps) {
  const isEdit = mode === 'edit'
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [orders, setOrders] = useState<PurchaseOrder[]>([])

  const [poSearch, setPoSearch] = useState('')
  const [selectedPoId, setSelectedPoId] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [uploadedBy, setUploadedBy] = useState('')
  const [uploadedAt, setUploadedAt] = useState('')
  const [receivedAt, setReceivedAt] = useState('')
  const [sellerSalesInvoiceNumber, setSellerSalesInvoiceNumber] = useState('')
  const [totalReceiptAmount, setTotalReceiptAmount] = useState('')
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([])
  const [sellerSalesInvoiceFile, setSellerSalesInvoiceFile] = useState<File | null>(null)
  const [freightCharges, setFreightCharges] = useState('')
  const [freightPaidBy, setFreightPaidBy] = useState('')
  const [isItemPaid, setIsItemPaid] = useState(false)
  const [amountPaid, setAmountPaid] = useState('')
  const [paymentReceiptFile, setPaymentReceiptFile] = useState<File | null>(null)
  const [notes, setNotes] = useState('')

  const [priceMismatchEnabled, setPriceMismatchEnabled] = useState(false)
  const [priceMismatchSearch, setPriceMismatchSearch] = useState('')
  const [priceMismatchRows, setPriceMismatchRows] = useState<PoDiscrepancyRow[]>([])
  const [priceMismatchSaved, setPriceMismatchSaved] = useState(false)
  const [priceMismatchMessage, setPriceMismatchMessage] = useState<string | null>(null)

  const [qtyMismatchEnabled, setQtyMismatchEnabled] = useState(false)
  const [qtyMismatchSearch, setQtyMismatchSearch] = useState('')
  const [qtyMismatchRows, setQtyMismatchRows] = useState<PoDiscrepancyRow[]>([])
  const [qtyMismatchSaved, setQtyMismatchSaved] = useState(false)
  const [qtyMismatchMessage, setQtyMismatchMessage] = useState<string | null>(null)

  const [itemMismatchEnabled, setItemMismatchEnabled] = useState(false)
  const [itemMismatchRows, setItemMismatchRows] = useState<ItemMismatchRow[]>([])
  const [itemMismatchSaved, setItemMismatchSaved] = useState(false)
  const [itemMismatchMessage, setItemMismatchMessage] = useState<string | null>(null)

  const [qualityIssueEnabled, setQualityIssueEnabled] = useState(false)
  const [qualityIssueSearch, setQualityIssueSearch] = useState('')
  const [qualityIssueRows, setQualityIssueRows] = useState<PoDiscrepancyRow[]>([])
  const [qualityIssueSaved, setQualityIssueSaved] = useState(false)
  const [qualityIssueMessage, setQualityIssueMessage] = useState<string | null>(null)

  const [otherIssuesEnabled, setOtherIssuesEnabled] = useState(false)
  const [otherIssuesNotes, setOtherIssuesNotes] = useState('')
  const [otherIssuesSaved, setOtherIssuesSaved] = useState(false)
  const [otherIssuesMessage, setOtherIssuesMessage] = useState<string | null>(null)
  const [existingReceiptId, setExistingReceiptId] = useState('')
  const [prNumber, setPrNumber] = useState('')

  useEffect(() => {
    void initialize()
  }, [mode, receiptId])

  const applyDiscrepanciesFromApi = (rows: ReceiptDiscrepancy[]) => {
    const priceRows: PoDiscrepancyRow[] = []
    const qtyRows: PoDiscrepancyRow[] = []
    const qualityRows: PoDiscrepancyRow[] = []
    const itemRows: ItemMismatchRow[] = []
    const otherNotes: string[] = []

    for (const row of rows) {
      if (row.issue_type === 'price_mismatch') {
        priceRows.push({
          item_id: row.item_id ?? '',
          sku: row.items?.sku ?? row.sku ?? '',
          item_name: row.items?.name ?? row.item_name ?? '',
          po_unit_price: Number(row.po_unit_price ?? 0),
          seller_invoice_unit_price: row.seller_invoice_unit_price != null ? String(row.seller_invoice_unit_price) : '',
          po_quantity: Number(row.po_quantity ?? 0),
          seller_invoice_quantity: row.seller_invoice_quantity != null ? String(row.seller_invoice_quantity) : '',
          quantity_received: row.quantity_received != null ? String(row.quantity_received) : '',
          rejection_quantity: row.rejection_quantity != null ? String(row.rejection_quantity) : '',
        })
        continue
      }
      if (row.issue_type === 'qty_mismatch') {
        qtyRows.push({
          item_id: row.item_id ?? '',
          sku: row.items?.sku ?? row.sku ?? '',
          item_name: row.items?.name ?? row.item_name ?? '',
          po_unit_price: Number(row.po_unit_price ?? 0),
          seller_invoice_unit_price: row.seller_invoice_unit_price != null ? String(row.seller_invoice_unit_price) : '',
          po_quantity: Number(row.po_quantity ?? 0),
          seller_invoice_quantity: row.seller_invoice_quantity != null ? String(row.seller_invoice_quantity) : '',
          quantity_received: row.quantity_received != null ? String(row.quantity_received) : '',
          rejection_quantity: row.rejection_quantity != null ? String(row.rejection_quantity) : '',
        })
        continue
      }
      if (row.issue_type === 'quality_issue') {
        qualityRows.push({
          item_id: row.item_id ?? '',
          sku: row.items?.sku ?? row.sku ?? '',
          item_name: row.items?.name ?? row.item_name ?? '',
          po_unit_price: Number(row.po_unit_price ?? 0),
          seller_invoice_unit_price: row.seller_invoice_unit_price != null ? String(row.seller_invoice_unit_price) : '',
          po_quantity: Number(row.po_quantity ?? 0),
          seller_invoice_quantity: row.seller_invoice_quantity != null ? String(row.seller_invoice_quantity) : '',
          quantity_received: row.quantity_received != null ? String(row.quantity_received) : '',
          rejection_quantity: row.rejection_quantity != null ? String(row.rejection_quantity) : '',
        })
        continue
      }
      if (row.issue_type === 'item_mismatch') {
        itemRows.push({
          key: row.id ?? `${row.sku ?? 'item'}-${itemRows.length}`,
          sku: row.sku ?? '',
          item_name: row.item_name ?? '',
          quantity_received: row.quantity_received != null ? String(row.quantity_received) : '',
          seller_invoice_unit_price: row.seller_invoice_unit_price != null ? String(row.seller_invoice_unit_price) : '',
        })
        continue
      }
      if (row.issue_type === 'other' && row.notes?.trim()) {
        otherNotes.push(row.notes.trim())
      }
    }

    setPriceMismatchEnabled(priceRows.length > 0)
    setPriceMismatchRows(priceRows)
    setPriceMismatchSaved(priceRows.length > 0)
    setQtyMismatchEnabled(qtyRows.length > 0)
    setQtyMismatchRows(qtyRows)
    setQtyMismatchSaved(qtyRows.length > 0)
    setQualityIssueEnabled(qualityRows.length > 0)
    setQualityIssueRows(qualityRows)
    setQualityIssueSaved(qualityRows.length > 0)
    setItemMismatchEnabled(itemRows.length > 0)
    setItemMismatchRows(itemRows.length > 0 ? itemRows : [])
    setItemMismatchSaved(itemRows.length > 0)
    setOtherIssuesEnabled(otherNotes.length > 0)
    setOtherIssuesNotes(otherNotes.join('\n\n'))
    setOtherIssuesSaved(otherNotes.length > 0)
  }

  const initialize = async () => {
    setLoading(true)
    setError(null)
    try {
      if (isEdit) {
        if (!receiptId) {
          setError('Purchase receipt id is required.')
          return
        }
        const receiptRes = await erpFetch<{ data: PurchaseReceiptDetail }>(`/api/purchase/receipts/${receiptId}`)
        const receipt = receiptRes.data
        if ((receipt.status ?? '').trim().toLowerCase() === 'paid') {
          setError('Paid purchase receipts cannot be edited.')
          return
        }
        const purchaseOrderId = receipt.purchase_order_id ?? receipt.purchase_orders?.id
        if (!purchaseOrderId) {
          setError('Purchase receipt is missing its purchase order.')
          return
        }
        const orderRes = await erpFetch<{ data: PurchaseOrder }>(`/api/purchase/orders/${purchaseOrderId}`)
        const order = orderRes.data
        setOrders([order])
        setExistingReceiptId(receipt.id)
        setPrNumber(receipt.pr_number ?? '')
        setSelectedPoId(purchaseOrderId)
        setSupplierId(receipt.supplier_id ?? order.supplier_id ?? order.suppliers?.id ?? '')
        setUploadedBy(receipt.uploaded_by_name ?? '')
        setUploadedAt(receipt.uploaded_at ? new Date(receipt.uploaded_at).toLocaleString('en-IN') : '')
        setReceivedAt(receipt.received_at ? String(receipt.received_at).slice(0, 10) : new Date().toISOString().slice(0, 10))
        setSellerSalesInvoiceNumber(receipt.seller_sales_invoice_number ?? '')
        setFreightCharges(receipt.freight_charges != null ? String(receipt.freight_charges) : '')
        setFreightPaidBy(receipt.freight_paid_by ?? '')
        setIsItemPaid(Boolean(receipt.is_item_paid))
        setAmountPaid(receipt.amount_paid != null ? String(receipt.amount_paid) : '')
        setNotes(receipt.notes ?? '')
        const items = (receipt.purchase_receipt_lines ?? [])
          .map((line) => ({
            item_id: String(line.item_id ?? ''),
            qty_received: Number(line.quantity ?? 0),
            unit_price: Number(line.unit_price ?? 0),
          }))
          .filter((line) => line.item_id && line.qty_received > 0)
        setReceiptItems(items)
        const amount = items.reduce((sum, row) => sum + row.qty_received * row.unit_price, 0)
        setTotalReceiptAmount(amount > 0 ? amount.toFixed(2) : receipt.total_amount != null ? String(receipt.total_amount) : '')
        applyDiscrepanciesFromApi(receipt.purchase_receipt_discrepancies ?? [])
        return
      }

      const [ordersRes, meRes] = await Promise.all([
        erpFetch<{ data: PurchaseOrder[] }>('/api/purchase/orders'),
        erpFetch<{ user: { firstName: string | null; lastName: string | null; email: string } }>('/api/me'),
      ])
      setOrders((ordersRes.data ?? []).filter((order) => order.status !== 'closed'))
      const name = `${meRes.user.firstName ?? ''} ${meRes.user.lastName ?? ''}`.trim() || meRes.user.email
      setUploadedBy(name)
      setUploadedAt(new Date().toLocaleString('en-IN'))
      setReceivedAt(new Date().toISOString().slice(0, 10))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load page')
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = useMemo(() => {
    const term = poSearch.trim().toLowerCase()
    if (!term) return orders
    return orders.filter((order) => (order.po_number ?? '').toLowerCase().includes(term))
  }, [orders, poSearch])

  const selectedPo = useMemo(() => orders.find((order) => order.id === selectedPoId) ?? null, [orders, selectedPoId])
  const selectedSupplier = selectedPo?.suppliers ?? null
  const selectedSupplierLabel = selectedSupplier
    ? `${selectedSupplier.supplier_code?.trim() ? `${selectedSupplier.supplier_code} - ` : ''}${selectedSupplier.name ?? '-'}`
    : '-'

  const receivedQtyByItem = (po: PurchaseOrder) => {
    const quantities = new Map<string, number>()
    for (const receipt of po.purchase_receipts ?? []) {
      if (receipt.status === 'cancelled') continue
      if (isEdit && existingReceiptId && receipt.id === existingReceiptId) continue
      for (const line of receipt.purchase_receipt_lines ?? []) {
        const itemId = line.item_id ?? ''
        if (!itemId) continue
        quantities.set(itemId, (quantities.get(itemId) ?? 0) + Number(line.quantity ?? 0))
      }
    }
    return quantities
  }

  const pendingQtyForLine = (po: PurchaseOrder, line: PurchaseOrderLine) => {
    const received = receivedQtyByItem(po).get(line.item_id) ?? 0
    return Math.max(Number(line.quantity ?? 0) - received, 0)
  }

  const applyPoAutofill = (po: PurchaseOrder) => {
    setSelectedPoId(po.id)
    setSupplierId(po.supplier_id ?? po.suppliers?.id ?? '')
    const poItems = (po.purchase_order_lines ?? [])
      .map((line) => ({
        item_id: line.item_id,
        qty_received: pendingQtyForLine(po, line),
        unit_price: Number(line.unit_price ?? 0),
      }))
      .filter((line) => line.qty_received > 0)
    setReceiptItems(poItems)
    const amount = poItems.reduce((sum, row) => sum + row.qty_received * row.unit_price, 0)
    setTotalReceiptAmount(amount > 0 ? amount.toFixed(2) : '')
    setError(null)
  }

  const syncReceiptItems = (nextItems: ReceiptItem[]) => {
    setReceiptItems(nextItems)
    const amount = nextItems.reduce((sum, row) => sum + row.qty_received * row.unit_price, 0)
    setTotalReceiptAmount(amount > 0 ? amount.toFixed(2) : '')
  }

  const updateReceiptItemQty = (itemId: string, value: string, maxQty: number) => {
    const rawQty = value === '' ? 0 : Number(value)
    const nextQty = Math.min(Math.max(rawQty || 0, 0), maxQty)
    syncReceiptItems(receiptItems.map((row) => (row.item_id === itemId ? { ...row, qty_received: nextQty } : row)))
  }

  const removeReceiptItem = (itemId: string) => {
    syncReceiptItems(receiptItems.filter((row) => row.item_id !== itemId))
  }

  const poLinesForSearch = useMemo(() => selectedPo?.purchase_order_lines ?? [], [selectedPo])

  const filterPoLines = (term: string, excludeItemIds: string[]) => {
    const normalized = term.trim().toLowerCase()
    return poLinesForSearch.filter((line) => {
      if (excludeItemIds.includes(line.item_id)) return false
      if (!normalized) return true
      const sku = line.items?.sku?.toLowerCase() ?? ''
      const name = line.items?.name?.toLowerCase() ?? ''
      return sku.includes(normalized) || name.includes(normalized)
    })
  }

  const receiptQtyForItem = (itemId: string) => {
    const row = receiptItems.find((item) => item.item_id === itemId)
    return row ? String(row.qty_received) : ''
  }

  const addPoLineToPriceMismatch = (line: PurchaseOrderLine) => {
    setPriceMismatchRows((rows) => [
      ...rows,
      {
        item_id: line.item_id,
        sku: line.items?.sku ?? '',
        item_name: line.items?.name ?? '',
        po_unit_price: Number(line.unit_price ?? 0),
        seller_invoice_unit_price: '',
        po_quantity: Number(line.quantity ?? 0),
        seller_invoice_quantity: '',
        quantity_received: receiptQtyForItem(line.item_id),
        rejection_quantity: '',
      },
    ])
    setPriceMismatchSaved(false)
    setPriceMismatchMessage(null)
    setPriceMismatchSearch('')
  }

  const addPoLineToQtyMismatch = (line: PurchaseOrderLine) => {
    setQtyMismatchRows((rows) => [
      ...rows,
      {
        item_id: line.item_id,
        sku: line.items?.sku ?? '',
        item_name: line.items?.name ?? '',
        po_unit_price: Number(line.unit_price ?? 0),
        seller_invoice_unit_price: '',
        po_quantity: Number(line.quantity ?? 0),
        seller_invoice_quantity: '',
        quantity_received: receiptQtyForItem(line.item_id),
        rejection_quantity: '',
      },
    ])
    setQtyMismatchSaved(false)
    setQtyMismatchMessage(null)
    setQtyMismatchSearch('')
  }

  const addPoLineToQualityIssue = (line: PurchaseOrderLine) => {
    setQualityIssueRows((rows) => [
      ...rows,
      {
        item_id: line.item_id,
        sku: line.items?.sku ?? '',
        item_name: line.items?.name ?? '',
        po_unit_price: Number(line.unit_price ?? 0),
        seller_invoice_unit_price: '',
        po_quantity: Number(line.quantity ?? 0),
        seller_invoice_quantity: '',
        quantity_received: receiptQtyForItem(line.item_id),
        rejection_quantity: '',
      },
    ])
    setQualityIssueSaved(false)
    setQualityIssueMessage(null)
    setQualityIssueSearch('')
  }

  const addItemMismatchRow = () => {
    setItemMismatchRows((rows) => [
      ...rows,
      {
        key: `${Date.now()}-${rows.length}`,
        sku: '',
        item_name: '',
        quantity_received: '',
        seller_invoice_unit_price: '',
      },
    ])
    setItemMismatchSaved(false)
    setItemMismatchMessage(null)
  }

  const savePriceMismatchSection = () => {
    if (priceMismatchRows.length === 0) {
      setPriceMismatchSaved(false)
      setPriceMismatchMessage('Add at least one item for price mismatch.')
      return
    }
    if (priceMismatchRows.some((row) => row.seller_invoice_unit_price.trim() === '' || Number(row.seller_invoice_unit_price) < 0)) {
      setPriceMismatchSaved(false)
      setPriceMismatchMessage('Enter a valid price on sales invoice for each item.')
      return
    }
    setPriceMismatchSaved(true)
    setPriceMismatchMessage('Saved.')
  }

  const saveQtyMismatchSection = () => {
    if (qtyMismatchRows.length === 0) {
      setQtyMismatchSaved(false)
      setQtyMismatchMessage('Add at least one item for qty mismatch.')
      return
    }
    if (
      qtyMismatchRows.some(
        (row) =>
          row.seller_invoice_quantity.trim() === '' ||
          Number(row.seller_invoice_quantity) < 0 ||
          row.quantity_received.trim() === '' ||
          Number(row.quantity_received) < 0,
      )
    ) {
      setQtyMismatchSaved(false)
      setQtyMismatchMessage('Enter valid qty on sales invoice and qty received for each item.')
      return
    }
    setQtyMismatchSaved(true)
    setQtyMismatchMessage('Saved.')
  }

  const saveItemMismatchSection = () => {
    if (itemMismatchRows.length === 0) {
      setItemMismatchSaved(false)
      setItemMismatchMessage('Add at least one item mismatch row.')
      return
    }
    if (
      itemMismatchRows.some(
        (row) =>
          row.item_name.trim() === '' ||
          row.quantity_received.trim() === '' ||
          Number(row.quantity_received) < 0 ||
          (row.seller_invoice_unit_price.trim() !== '' && Number(row.seller_invoice_unit_price) < 0),
      )
    ) {
      setItemMismatchSaved(false)
      setItemMismatchMessage('Enter item name and qty received for each row. Price on sales invoice is optional.')
      return
    }
    setItemMismatchSaved(true)
    setItemMismatchMessage('Saved.')
  }

  const saveQualityIssueSection = () => {
    if (qualityIssueRows.length === 0) {
      setQualityIssueSaved(false)
      setQualityIssueMessage('Add at least one item for quality issue.')
      return
    }
    if (
      qualityIssueRows.some(
        (row) =>
          row.quantity_received.trim() === '' ||
          Number(row.quantity_received) < 0 ||
          row.rejection_quantity.trim() === '' ||
          Number(row.rejection_quantity) < 0,
      )
    ) {
      setQualityIssueSaved(false)
      setQualityIssueMessage('Enter valid qty received and rejection qty for each item.')
      return
    }
    setQualityIssueSaved(true)
    setQualityIssueMessage('Saved.')
  }

  const saveOtherIssuesSection = () => {
    if (!otherIssuesNotes.trim()) {
      setOtherIssuesSaved(false)
      setOtherIssuesMessage('Describe the issue before saving.')
      return
    }
    setOtherIssuesSaved(true)
    setOtherIssuesMessage('Saved.')
  }

  const buildDiscrepancies = (): DiscrepancyPayload[] => {
    const rows: DiscrepancyPayload[] = []
    if (priceMismatchEnabled) {
      for (const row of priceMismatchRows) {
        rows.push({
          issue_type: 'price_mismatch',
          item_id: row.item_id,
          sku: row.sku,
          item_name: row.item_name,
          po_unit_price: row.po_unit_price,
          seller_invoice_unit_price: Number(row.seller_invoice_unit_price),
        })
      }
    }
    if (qtyMismatchEnabled) {
      for (const row of qtyMismatchRows) {
        rows.push({
          issue_type: 'qty_mismatch',
          item_id: row.item_id,
          sku: row.sku,
          item_name: row.item_name,
          po_quantity: row.po_quantity,
          seller_invoice_quantity: Number(row.seller_invoice_quantity),
          quantity_received: Number(row.quantity_received),
        })
      }
    }
    if (itemMismatchEnabled) {
      for (const row of itemMismatchRows) {
        rows.push({
          issue_type: 'item_mismatch',
          sku: row.sku.trim() || null,
          item_name: row.item_name.trim(),
          quantity_received: Number(row.quantity_received),
          seller_invoice_unit_price: row.seller_invoice_unit_price.trim() ? Number(row.seller_invoice_unit_price) : null,
        })
      }
    }
    if (qualityIssueEnabled) {
      for (const row of qualityIssueRows) {
        rows.push({
          issue_type: 'quality_issue',
          item_id: row.item_id,
          sku: row.sku,
          item_name: row.item_name,
          quantity_received: Number(row.quantity_received),
          rejection_quantity: Number(row.rejection_quantity),
        })
      }
    }
    if (otherIssuesEnabled) {
      rows.push({
        issue_type: 'other',
        notes: otherIssuesNotes.trim(),
      })
    }
    return rows
  }

  const validateDiscrepancySections = () => {
    if (priceMismatchEnabled && !priceMismatchSaved) return 'Save the price mismatch section before submitting.'
    if (qtyMismatchEnabled && !qtyMismatchSaved) return 'Save the qty mismatch section before submitting.'
    if (itemMismatchEnabled && !itemMismatchSaved) return 'Save the item mismatch section before submitting.'
    if (qualityIssueEnabled && !qualityIssueSaved) return 'Save the quality issue section before submitting.'
    if (otherIssuesEnabled && !otherIssuesSaved) return 'Save the other issues section before submitting.'
    return null
  }

  const save = async () => {
    if (!selectedPoId) {
      setError('Purchase order is required.')
      return
    }
    if (!supplierId) {
      setError('Selected purchase order does not have a supplier.')
      return
    }
    if (!sellerSalesInvoiceNumber.trim()) {
      setError('Seller sales invoice number is required.')
      return
    }
    if (!isEdit && !sellerSalesInvoiceFile) {
      setError('Please upload seller sales invoice file.')
      return
    }
    if (receiptItems.length === 0) {
      setError('Please add at least one item.')
      return
    }
    if (receiptItems.some((row) => Number(row.qty_received) <= 0)) {
      setError('Each item must have qty received greater than 0.')
      return
    }
    if (Number(totalReceiptAmount || 0) <= 0) {
      setError('Total receipt amount must be greater than 0.')
      return
    }
    const discrepancyError = validateDiscrepancySections()
    if (discrepancyError) {
      setError(discrepancyError)
      return
    }

    setSaving(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('received_at', receivedAt)
      formData.append('seller_sales_invoice_number', sellerSalesInvoiceNumber.trim())
      formData.append('notes', notes)
      formData.append('freight_charges', freightCharges || '0')
      formData.append('freight_paid_by', freightPaidBy)
      formData.append('is_item_paid', String(isItemPaid))
      formData.append('amount_paid', amountPaid || '0')
      formData.append(
        'lines',
        JSON.stringify(
          receiptItems.map((row) => ({
            item_id: row.item_id,
            quantity: Number(row.qty_received || 0),
            unit_price: Number(row.unit_price || 0),
          })),
        ),
      )
      if (!isEdit) {
        formData.append('supplier_id', supplierId)
        formData.append('purchase_order_id', selectedPoId)
        formData.append('uploaded_by_name', uploadedBy)
        formData.append('uploaded_at', new Date().toISOString())
        formData.append('total_receipt_amount', totalReceiptAmount || '0')
      }
      if (sellerSalesInvoiceFile) formData.append('seller_sales_invoice_file', sellerSalesInvoiceFile)
      if (paymentReceiptFile) formData.append('payment_receipt_file', paymentReceiptFile)
      const discrepancies = buildDiscrepancies()
      formData.append('discrepancies', JSON.stringify(discrepancies))

      if (isEdit) {
        await erpFetch(`/api/purchase/receipts/${existingReceiptId}`, { method: 'PATCH', body: formData })
        window.location.href = `/dashboard/purchase/receipts/${existingReceiptId}`
        return
      }

      await erpFetch('/api/purchase/receipts', { method: 'POST', body: formData })
      window.location.href = '/dashboard/purchase/receipts'
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save purchase receipt')
    } finally {
      setSaving(false)
    }
  }

  const backHref =
    isEdit && (existingReceiptId || receiptId)
      ? `/dashboard/purchase/receipts/${existingReceiptId || receiptId}`
      : '/dashboard/purchase/receipts'

  if (loading) {
    return <div className="p-8 text-sm text-muted-foreground">{isEdit ? 'Loading purchase receipt...' : 'Loading add receipt form...'}</div>
  }

  if (error && isEdit && !selectedPo) {
    return (
      <div className="p-8 space-y-4">
        <Link href={backHref}>
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft size={16} />
            Back
          </Button>
        </Link>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href={backHref}>
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft size={16} />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{isEdit ? 'Edit Purchase Receipt' : 'Add Purchase Receipt'}</h1>
          {isEdit && prNumber ? <p className="text-sm text-muted-foreground">{prNumber}</p> : null}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!isEdit ? (
        <Card>
          <CardHeader>
            <CardTitle>Purchase Order *</CardTitle>
            <CardDescription>Select a purchase order first. The receipt details and items are filled from it.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Search purchase order by PO number..."
              value={poSearch}
              onChange={(e) => setPoSearch(e.target.value)}
            />
            <div className="max-h-40 overflow-auto rounded-md border p-2">
              {filteredOrders.map((order) => (
                <button
                  key={order.id}
                  type="button"
                  className={`mb-1 w-full rounded px-3 py-2 text-left text-sm ${
                    selectedPoId === order.id ? 'bg-blue-100 dark:bg-blue-900/40' : 'hover:bg-muted'
                  }`}
                  onClick={() => applyPoAutofill(order)}
                >
                  {order.po_number ?? order.id} ({order.status})
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Purchase Order</CardTitle>
            <CardDescription>The purchase order cannot be changed while editing a receipt.</CardDescription>
          </CardHeader>
          <CardContent>
            <Input value={selectedPo?.po_number ?? selectedPoId} disabled />
          </CardContent>
        </Card>
      )}

      {!selectedPo ? (
        <span className="text-sm text-muted-foreground"></span>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Receipt Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="mb-1 text-sm font-medium">Supplier</p>
                <Input value={selectedSupplierLabel} disabled />
              </div>
              <div>
                <p className="mb-1 text-sm font-medium">Uploaded by</p>
                <Input value={uploadedBy} disabled />
              </div>
              <div>
                <p className="mb-1 text-sm font-medium">Date & Time of Upload</p>
                <Input value={uploadedAt} disabled />
              </div>
              <div>
                <p className="mb-1 text-sm font-medium">Received at</p>
                <Input type="date" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} />
              </div>
              <div>
                <p className="mb-1 text-sm font-medium">Seller's Sales Invoice Number *</p>
                <Input value={sellerSalesInvoiceNumber} onChange={(e) => setSellerSalesInvoiceNumber(e.target.value)} />
              </div>
              <div>
                <p className="mb-1 text-sm font-medium">Total Receipt Amount</p>
                <Input type="number" step="0.01" value={totalReceiptAmount} disabled />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent>
              {receiptItems.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Item Name</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receiptItems.map((row) => {
                      const line = selectedPo.purchase_order_lines?.find((poLine) => poLine.item_id === row.item_id)
                      const maxQty = line ? pendingQtyForLine(selectedPo, line) : 0
                      const total = row.qty_received * row.unit_price
                      return (
                        <TableRow key={row.item_id}>
                          <TableCell className="font-mono">{line?.items?.sku ?? '-'}</TableCell>
                          <TableCell>{line?.items?.name ?? '-'}</TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min="0"
                              max={maxQty}
                              value={row.qty_received === 0 ? '' : String(row.qty_received)}
                              onChange={(e) => updateReceiptItemQty(row.item_id, e.target.value, maxQty)}
                              className="ml-auto w-28 text-right"
                            />
                          </TableCell>
                          <TableCell className="text-right">₹{row.unit_price.toFixed(2)}</TableCell>
                          <TableCell className="text-right">₹{total.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeReceiptItem(row.item_id)}>
                              <Trash2 size={14} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">No pending items found on the selected purchase order.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Documents and Payment</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="mb-1 text-sm font-medium">
                  {isEdit ? "Replace Seller's Sales Invoice (optional)" : "Upload Seller's Sales Invoice *"}
                </p>
                <Input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={(e) => setSellerSalesInvoiceFile(e.target.files?.[0] ?? null)} />
              </div>
              <div>
                <p className="mb-1 text-sm font-medium">Freight Charges Paid</p>
                <Input type="number" step="0.01" value={freightCharges} onChange={(e) => setFreightCharges(e.target.value)} />
              </div>
              <div>
                <p className="mb-1 text-sm font-medium">Freight Charges Paid By</p>
                <Input value={freightPaidBy} onChange={(e) => setFreightPaidBy(e.target.value)} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Checkbox checked={isItemPaid} onCheckedChange={(checked) => setIsItemPaid(Boolean(checked))} />
                <p className="text-sm font-medium">Is the Item Paid for?</p>
              </div>

              {isItemPaid && (
                <>
                  <div>
                    <p className="mb-1 text-sm font-medium">Amount Paid</p>
                    <Input type="number" step="0.01" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} />
                  </div>
                  <div>
                    <p className="mb-1 text-sm font-medium">Upload Payment Receipt (optional)</p>
                    <Input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={(e) => setPaymentReceiptFile(e.target.files?.[0] ?? null)} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Report Discrepancies</CardTitle>
              <CardDescription>Log issues between the purchase order, goods received, and seller sales invoice.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3 rounded-md border p-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={priceMismatchEnabled}
                    onCheckedChange={(checked) => {
                      const enabled = Boolean(checked)
                      setPriceMismatchEnabled(enabled)
                      setPriceMismatchSaved(false)
                      setPriceMismatchMessage(null)
                      if (!enabled) {
                        setPriceMismatchRows([])
                        setPriceMismatchSearch('')
                      }
                    }}
                  />
                  <p className="text-sm font-medium">Price mismatch</p>
                </div>
                {priceMismatchEnabled && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      The item price on PO and item price on seller&apos;s sales invoice do not match.
                    </p>
                    <Input
                      placeholder="Search items from the purchase order..."
                      value={priceMismatchSearch}
                      onChange={(e) => setPriceMismatchSearch(e.target.value)}
                    />
                    <div className="max-h-32 overflow-auto rounded-md border p-2">
                      {filterPoLines(
                        priceMismatchSearch,
                        priceMismatchRows.map((row) => row.item_id),
                      ).map((line) => (
                        <button
                          key={line.item_id}
                          type="button"
                          className="mb-1 w-full rounded px-3 py-2 text-left text-sm hover:bg-muted"
                          onClick={() => addPoLineToPriceMismatch(line)}
                        >
                          {line.items?.sku ?? '-'} - {line.items?.name ?? '-'}
                        </button>
                      ))}
                    </div>
                    {priceMismatchRows.length > 0 && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>SKU</TableHead>
                            <TableHead>Item</TableHead>
                            <TableHead className="text-right">Price on PO</TableHead>
                            <TableHead className="text-right">Price on Sales Invoice</TableHead>
                            <TableHead className="w-12" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {priceMismatchRows.map((row) => (
                            <TableRow key={row.item_id}>
                              <TableCell className="font-mono">{row.sku}</TableCell>
                              <TableCell>{row.item_name}</TableCell>
                              <TableCell className="text-right">₹{row.po_unit_price.toFixed(2)}</TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={row.seller_invoice_unit_price}
                                  onChange={(e) => {
                                    const value = e.target.value
                                    setPriceMismatchRows((rows) =>
                                      rows.map((entry) =>
                                        entry.item_id === row.item_id ? { ...entry, seller_invoice_unit_price: value } : entry,
                                      ),
                                    )
                                    setPriceMismatchSaved(false)
                                    setPriceMismatchMessage(null)
                                  }}
                                  className="ml-auto w-36 text-right"
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setPriceMismatchRows((rows) => rows.filter((entry) => entry.item_id !== row.item_id))
                                    setPriceMismatchSaved(false)
                                    setPriceMismatchMessage(null)
                                  }}
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                    <div className="flex items-center gap-3">
                      <Button type="button" variant="outline" onClick={savePriceMismatchSection}>
                        Save
                      </Button>
                      {priceMismatchMessage && (
                        <p className={`text-sm ${priceMismatchSaved ? 'text-green-600' : 'text-red-600'}`}>{priceMismatchMessage}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3 rounded-md border p-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={qtyMismatchEnabled}
                    onCheckedChange={(checked) => {
                      const enabled = Boolean(checked)
                      setQtyMismatchEnabled(enabled)
                      setQtyMismatchSaved(false)
                      setQtyMismatchMessage(null)
                      if (!enabled) {
                        setQtyMismatchRows([])
                        setQtyMismatchSearch('')
                      }
                    }}
                  />
                  <p className="text-sm font-medium">Qty mismatch</p>
                </div>
                {qtyMismatchEnabled && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Qty of item received is less than the qty on seller&apos;s sales invoice.
                    </p>
                    <Input
                      placeholder="Search items from the purchase order..."
                      value={qtyMismatchSearch}
                      onChange={(e) => setQtyMismatchSearch(e.target.value)}
                    />
                    <div className="max-h-32 overflow-auto rounded-md border p-2">
                      {filterPoLines(
                        qtyMismatchSearch,
                        qtyMismatchRows.map((row) => row.item_id),
                      ).map((line) => (
                        <button
                          key={line.item_id}
                          type="button"
                          className="mb-1 w-full rounded px-3 py-2 text-left text-sm hover:bg-muted"
                          onClick={() => addPoLineToQtyMismatch(line)}
                        >
                          {line.items?.sku ?? '-'} - {line.items?.name ?? '-'}
                        </button>
                      ))}
                    </div>
                    {qtyMismatchRows.length > 0 && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>SKU</TableHead>
                            <TableHead>Item</TableHead>
                            <TableHead className="text-right">Qty on PO</TableHead>
                            <TableHead className="text-right">Qty on Sales Invoice</TableHead>
                            <TableHead className="text-right">Qty Received</TableHead>
                            <TableHead className="w-12" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {qtyMismatchRows.map((row) => (
                            <TableRow key={row.item_id}>
                              <TableCell className="font-mono">{row.sku}</TableCell>
                              <TableCell>{row.item_name}</TableCell>
                              <TableCell className="text-right">{row.po_quantity}</TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  min="0"
                                  value={row.seller_invoice_quantity}
                                  onChange={(e) => {
                                    const value = e.target.value
                                    setQtyMismatchRows((rows) =>
                                      rows.map((entry) =>
                                        entry.item_id === row.item_id ? { ...entry, seller_invoice_quantity: value } : entry,
                                      ),
                                    )
                                    setQtyMismatchSaved(false)
                                    setQtyMismatchMessage(null)
                                  }}
                                  className="ml-auto w-28 text-right"
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  min="0"
                                  value={row.quantity_received}
                                  onChange={(e) => {
                                    const value = e.target.value
                                    setQtyMismatchRows((rows) =>
                                      rows.map((entry) =>
                                        entry.item_id === row.item_id ? { ...entry, quantity_received: value } : entry,
                                      ),
                                    )
                                    setQtyMismatchSaved(false)
                                    setQtyMismatchMessage(null)
                                  }}
                                  className="ml-auto w-28 text-right"
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setQtyMismatchRows((rows) => rows.filter((entry) => entry.item_id !== row.item_id))
                                    setQtyMismatchSaved(false)
                                    setQtyMismatchMessage(null)
                                  }}
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                    <div className="flex items-center gap-3">
                      <Button type="button" variant="outline" onClick={saveQtyMismatchSection}>
                        Save
                      </Button>
                      {qtyMismatchMessage && (
                        <p className={`text-sm ${qtyMismatchSaved ? 'text-green-600' : 'text-red-600'}`}>{qtyMismatchMessage}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3 rounded-md border p-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={itemMismatchEnabled}
                    onCheckedChange={(checked) => {
                      const enabled = Boolean(checked)
                      setItemMismatchEnabled(enabled)
                      setItemMismatchSaved(false)
                      setItemMismatchMessage(null)
                      if (!enabled) setItemMismatchRows([])
                      else if (itemMismatchRows.length === 0) addItemMismatchRow()
                    }}
                  />
                  <p className="text-sm font-medium">Item mismatch</p>
                </div>
                {itemMismatchEnabled && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      The item received is different than the one on seller&apos;s sales invoice.
                    </p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>SKU (optional)</TableHead>
                          <TableHead>Item</TableHead>
                          <TableHead className="text-right">Qty Received</TableHead>
                          <TableHead className="text-right">Price on Sales Invoice (optional)</TableHead>
                          <TableHead className="w-12" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {itemMismatchRows.map((row) => (
                          <TableRow key={row.key}>
                            <TableCell>
                              <Input
                                value={row.sku}
                                onChange={(e) => {
                                  const value = e.target.value
                                  setItemMismatchRows((rows) =>
                                    rows.map((entry) => (entry.key === row.key ? { ...entry, sku: value } : entry)),
                                  )
                                  setItemMismatchSaved(false)
                                  setItemMismatchMessage(null)
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={row.item_name}
                                onChange={(e) => {
                                  const value = e.target.value
                                  setItemMismatchRows((rows) =>
                                    rows.map((entry) => (entry.key === row.key ? { ...entry, item_name: value } : entry)),
                                  )
                                  setItemMismatchSaved(false)
                                  setItemMismatchMessage(null)
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                value={row.quantity_received}
                                onChange={(e) => {
                                  const value = e.target.value
                                  setItemMismatchRows((rows) =>
                                    rows.map((entry) => (entry.key === row.key ? { ...entry, quantity_received: value } : entry)),
                                  )
                                  setItemMismatchSaved(false)
                                  setItemMismatchMessage(null)
                                }}
                                className="ml-auto w-28 text-right"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={row.seller_invoice_unit_price}
                                onChange={(e) => {
                                  const value = e.target.value
                                  setItemMismatchRows((rows) =>
                                    rows.map((entry) =>
                                      entry.key === row.key ? { ...entry, seller_invoice_unit_price: value } : entry,
                                    ),
                                  )
                                  setItemMismatchSaved(false)
                                  setItemMismatchMessage(null)
                                }}
                                className="ml-auto w-36 text-right"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setItemMismatchRows((rows) => rows.filter((entry) => entry.key !== row.key))
                                  setItemMismatchSaved(false)
                                  setItemMismatchMessage(null)
                                }}
                              >
                                <Trash2 size={14} />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <Button type="button" variant="outline" onClick={addItemMismatchRow}>
                      Add row
                    </Button>
                    <div className="flex items-center gap-3">
                      <Button type="button" variant="outline" onClick={saveItemMismatchSection}>
                        Save
                      </Button>
                      {itemMismatchMessage && (
                        <p className={`text-sm ${itemMismatchSaved ? 'text-green-600' : 'text-red-600'}`}>{itemMismatchMessage}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3 rounded-md border p-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={qualityIssueEnabled}
                    onCheckedChange={(checked) => {
                      const enabled = Boolean(checked)
                      setQualityIssueEnabled(enabled)
                      setQualityIssueSaved(false)
                      setQualityIssueMessage(null)
                      if (!enabled) {
                        setQualityIssueRows([])
                        setQualityIssueSearch('')
                      }
                    }}
                  />
                  <p className="text-sm font-medium">Quality issue</p>
                </div>
                {qualityIssueEnabled && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Item quality is not satisfactory.</p>
                    <Input
                      placeholder="Search items from the purchase order..."
                      value={qualityIssueSearch}
                      onChange={(e) => setQualityIssueSearch(e.target.value)}
                    />
                    <div className="max-h-32 overflow-auto rounded-md border p-2">
                      {filterPoLines(
                        qualityIssueSearch,
                        qualityIssueRows.map((row) => row.item_id),
                      ).map((line) => (
                        <button
                          key={line.item_id}
                          type="button"
                          className="mb-1 w-full rounded px-3 py-2 text-left text-sm hover:bg-muted"
                          onClick={() => addPoLineToQualityIssue(line)}
                        >
                          {line.items?.sku ?? '-'} - {line.items?.name ?? '-'}
                        </button>
                      ))}
                    </div>
                    {qualityIssueRows.length > 0 && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>SKU</TableHead>
                            <TableHead>Item</TableHead>
                            <TableHead className="text-right">Qty Received</TableHead>
                            <TableHead className="text-right">Rejection Qty</TableHead>
                            <TableHead className="w-12" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {qualityIssueRows.map((row) => (
                            <TableRow key={row.item_id}>
                              <TableCell className="font-mono">{row.sku}</TableCell>
                              <TableCell>{row.item_name}</TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  min="0"
                                  value={row.quantity_received}
                                  onChange={(e) => {
                                    const value = e.target.value
                                    setQualityIssueRows((rows) =>
                                      rows.map((entry) =>
                                        entry.item_id === row.item_id ? { ...entry, quantity_received: value } : entry,
                                      ),
                                    )
                                    setQualityIssueSaved(false)
                                    setQualityIssueMessage(null)
                                  }}
                                  className="ml-auto w-28 text-right"
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  min="0"
                                  value={row.rejection_quantity}
                                  onChange={(e) => {
                                    const value = e.target.value
                                    setQualityIssueRows((rows) =>
                                      rows.map((entry) =>
                                        entry.item_id === row.item_id ? { ...entry, rejection_quantity: value } : entry,
                                      ),
                                    )
                                    setQualityIssueSaved(false)
                                    setQualityIssueMessage(null)
                                  }}
                                  className="ml-auto w-28 text-right"
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setQualityIssueRows((rows) => rows.filter((entry) => entry.item_id !== row.item_id))
                                    setQualityIssueSaved(false)
                                    setQualityIssueMessage(null)
                                  }}
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                    <div className="flex items-center gap-3">
                      <Button type="button" variant="outline" onClick={saveQualityIssueSection}>
                        Save
                      </Button>
                      {qualityIssueMessage && (
                        <p className={`text-sm ${qualityIssueSaved ? 'text-green-600' : 'text-red-600'}`}>{qualityIssueMessage}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3 rounded-md border p-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={otherIssuesEnabled}
                    onCheckedChange={(checked) => {
                      const enabled = Boolean(checked)
                      setOtherIssuesEnabled(enabled)
                      setOtherIssuesSaved(false)
                      setOtherIssuesMessage(null)
                      if (!enabled) setOtherIssuesNotes('')
                    }}
                  />
                  <p className="text-sm font-medium">Other issues</p>
                </div>
                {otherIssuesEnabled && (
                  <div className="space-y-3">
                    <Textarea
                      rows={3}
                      placeholder="Description of the issue"
                      value={otherIssuesNotes}
                      onChange={(e) => {
                        setOtherIssuesNotes(e.target.value)
                        setOtherIssuesSaved(false)
                        setOtherIssuesMessage(null)
                      }}
                    />
                    <div className="flex items-center gap-3">
                      <Button type="button" variant="outline" onClick={saveOtherIssuesSection}>
                        Save
                      </Button>
                      {otherIssuesMessage && (
                        <p className={`text-sm ${otherIssuesSaved ? 'text-green-600' : 'text-red-600'}`}>{otherIssuesMessage}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Save'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
