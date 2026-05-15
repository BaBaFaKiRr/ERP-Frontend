'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

type Supplier = {
  id: string
  name?: string | null
  supplier_code?: string | null
}

type Customer = {
  id: string
  name?: string | null
}

type Employee = {
  id: string
  full_name?: string | null
  employee_code?: string | null
}

type PurchaseOrder = {
  id: string
  po_number?: string | null
}

type PurchaseReceipt = {
  id: string
  pr_number?: string | null
}

type PurchaseInvoice = {
  id: string
  pi_number: string
}

type SalesInvoice = {
  id: string
  invoice_number?: string | null
}

type SalesOrder = {
  id: string
  order_number?: string | null
}

type MeUser = {
  firstName?: string | null
  lastName?: string | null
  email?: string | null
}

type EntityType = 'supplier' | 'customer' | 'employee' | 'other'
type LinkCategory = 'purchase' | 'sale' | 'maintenance' | 'hr' | 'business_event' | 'miscellaneous'
type PurchaseLinkType = 'po' | 'pr' | 'pi'
type SaleLinkType = 'sales_invoice' | 'proforma'

const WRAPPED_TOGGLE_GROUP = 'flex h-auto w-full flex-wrap gap-2'
const WRAPPED_TOGGLE_ITEM =
  'min-w-0 shrink-0 grow-0 basis-auto flex-none rounded-md px-3 shadow-none data-[variant=outline]:border-l data-[variant=outline]:first:border-l'

function toLocalYmd(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function NewJournalEntryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading create journal entry form...</div>}>
      <NewJournalEntryContent />
    </Suspense>
  )
}

function NewJournalEntryContent() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [direction, setDirection] = useState<'received' | 'made'>('received')
  const [entityType, setEntityType] = useState<EntityType>('supplier')
  const [entitySearch, setEntitySearch] = useState('')
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedSupplierId, setSelectedSupplierId] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [otherName, setOtherName] = useState('')
  const [otherCompany, setOtherCompany] = useState('')
  const [otherDesignation, setOtherDesignation] = useState('')
  const [otherPhoneNumber, setOtherPhoneNumber] = useState('')
  const [otherNote, setOtherNote] = useState('')
  const [transactionDate, setTransactionDate] = useState(toLocalYmd(new Date()))
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [paymentReceiptFile, setPaymentReceiptFile] = useState<File | null>(null)
  const [salesInvoiceFile, setSalesInvoiceFile] = useState<File | null>(null)
  const [linkCategory, setLinkCategory] = useState<LinkCategory | ''>('')
  const [purchaseLinkType, setPurchaseLinkType] = useState<PurchaseLinkType>('po')
  const [saleLinkType, setSaleLinkType] = useState<SaleLinkType>('sales_invoice')
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [purchaseReceipts, setPurchaseReceipts] = useState<PurchaseReceipt[]>([])
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>([])
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>([])
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([])
  const [poSearch, setPoSearch] = useState('')
  const [prSearch, setPrSearch] = useState('')
  const [piSearch, setPiSearch] = useState('')
  const [siSearch, setSiSearch] = useState('')
  const [soSearch, setSoSearch] = useState('')
  const [selectedPurchaseOrderId, setSelectedPurchaseOrderId] = useState('')
  const [selectedPurchaseReceiptId, setSelectedPurchaseReceiptId] = useState('')
  const [selectedPurchaseInvoiceId, setSelectedPurchaseInvoiceId] = useState('')
  const [selectedSalesInvoiceId, setSelectedSalesInvoiceId] = useState('')
  const [selectedSalesOrderId, setSelectedSalesOrderId] = useState('')
  const [createdByLabel, setCreatedByLabel] = useState('—')
  const [createdAtLabel, setCreatedAtLabel] = useState('—')

  useEffect(() => {
    void load()
  }, [])

  const filteredSuppliers = useMemo(() => {
    const term = entitySearch.trim().toLowerCase()
    if (!term) return suppliers
    return suppliers.filter((row) => {
      const label = `${row.supplier_code ?? ''} ${row.name ?? ''}`.toLowerCase()
      return label.includes(term)
    })
  }, [suppliers, entitySearch])

  const filteredCustomers = useMemo(() => {
    const term = entitySearch.trim().toLowerCase()
    if (!term) return customers
    return customers.filter((row) => (row.name ?? '').toLowerCase().includes(term))
  }, [customers, entitySearch])

  const filteredEmployees = useMemo(() => {
    const term = entitySearch.trim().toLowerCase()
    if (!term) return employees
    return employees.filter((row) => {
      const label = `${row.employee_code ?? ''} ${row.full_name ?? ''}`.toLowerCase()
      return label.includes(term)
    })
  }, [employees, entitySearch])

  const filteredPurchaseOrders = useMemo(() => {
    const term = poSearch.trim().toLowerCase()
    if (!term) return purchaseOrders
    return purchaseOrders.filter((row) => (row.po_number ?? '').toLowerCase().includes(term))
  }, [purchaseOrders, poSearch])

  const filteredPurchaseReceipts = useMemo(() => {
    const term = prSearch.trim().toLowerCase()
    if (!term) return purchaseReceipts
    return purchaseReceipts.filter((row) => (row.pr_number ?? '').toLowerCase().includes(term))
  }, [purchaseReceipts, prSearch])

  const filteredPurchaseInvoices = useMemo(() => {
    const term = piSearch.trim().toLowerCase()
    if (!term) return purchaseInvoices
    return purchaseInvoices.filter((row) => row.pi_number.toLowerCase().includes(term))
  }, [purchaseInvoices, piSearch])

  const filteredSalesInvoices = useMemo(() => {
    const term = siSearch.trim().toLowerCase()
    if (!term) return salesInvoices
    return salesInvoices.filter((row) => (row.invoice_number ?? '').toLowerCase().includes(term))
  }, [salesInvoices, siSearch])

  const filteredSalesOrders = useMemo(() => {
    const term = soSearch.trim().toLowerCase()
    if (!term) return salesOrders
    return salesOrders.filter((row) => (row.order_number ?? '').toLowerCase().includes(term))
  }, [salesOrders, soSearch])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [suppliersRes, customersRes, employeesRes, ordersRes, receiptsRes, invoicesRes, salesInvoicesRes, salesOrdersRes, meRes] =
        await Promise.all([
          erpFetch<{ data: Supplier[] }>('/api/suppliers'),
          erpFetch<{ data: Customer[] }>('/api/customers?limit=100'),
          erpFetch<{ data: Employee[] }>('/api/employees'),
          erpFetch<{ data: PurchaseOrder[] }>('/api/purchase/orders'),
          erpFetch<{ data: PurchaseReceipt[] }>('/api/purchase/receipts'),
          erpFetch<{ data: PurchaseInvoice[] }>('/api/purchase/invoices'),
          erpFetch<{ data: SalesInvoice[] }>('/api/dispatch-sales-invoices'),
          erpFetch<{ data: SalesOrder[] }>('/api/sales-orders'),
          erpFetch<{ user: MeUser }>('/api/me'),
        ])
      setSuppliers(suppliersRes.data ?? [])
      setCustomers(customersRes.data ?? [])
      setEmployees(employeesRes.data ?? [])
      setPurchaseOrders(ordersRes.data ?? [])
      setPurchaseReceipts(receiptsRes.data ?? [])
      setPurchaseInvoices(invoicesRes.data ?? [])
      setSalesInvoices(salesInvoicesRes.data ?? [])
      setSalesOrders(salesOrdersRes.data ?? [])
      const user = meRes.user
      const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
      setCreatedByLabel(name || user.email || '—')
      setCreatedAtLabel(new Date().toLocaleString('en-IN'))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load journal entry form')
    } finally {
      setLoading(false)
    }
  }

  const resetEntitySelection = () => {
    setEntitySearch('')
    setSelectedSupplierId('')
    setSelectedCustomerId('')
    setSelectedEmployeeId('')
    setOtherName('')
    setOtherCompany('')
    setOtherDesignation('')
    setOtherPhoneNumber('')
    setOtherNote('')
  }

  const chooseSupplier = (supplier: Supplier) => {
    const label = `${supplier.supplier_code ? `${supplier.supplier_code} - ` : ''}${supplier.name ?? supplier.id}`
    setSelectedSupplierId(supplier.id)
    setEntitySearch(label)
  }

  const chooseCustomer = (customer: Customer) => {
    setSelectedCustomerId(customer.id)
    setEntitySearch(customer.name ?? customer.id)
  }

  const chooseEmployee = (employee: Employee) => {
    const label = `${employee.employee_code ? `${employee.employee_code} - ` : ''}${employee.full_name ?? employee.id}`
    setSelectedEmployeeId(employee.id)
    setEntitySearch(label)
  }

  const save = async () => {
    const normalizedAmount = Number(amount)
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      setError('Total amount must be greater than 0.')
      return
    }
    if (!transactionDate.trim()) {
      setError('Date of transaction is required.')
      return
    }
    if (entityType === 'supplier' && !selectedSupplierId) {
      setError('Choose a supplier.')
      return
    }
    if (entityType === 'customer' && !selectedCustomerId) {
      setError('Choose a customer.')
      return
    }
    if (entityType === 'employee' && !selectedEmployeeId) {
      setError('Choose an employee.')
      return
    }
    if (entityType === 'other') {
      if (!otherName.trim()) {
        setError('Name is required for other entity.')
        return
      }
      if (!otherPhoneNumber.trim()) {
        setError('Phone number is required for other entity.')
        return
      }
    }

    setSaving(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('direction', direction)
      formData.append('entity_type', entityType)
      formData.append('transaction_date', transactionDate)
      formData.append('amount', String(normalizedAmount))
      if (description.trim()) formData.append('description', description.trim())
      if (entityType === 'supplier') formData.append('supplier_id', selectedSupplierId)
      if (entityType === 'customer') formData.append('customer_id', selectedCustomerId)
      if (entityType === 'employee') formData.append('employee_id', selectedEmployeeId)
      if (entityType === 'other') {
        formData.append('other_name', otherName.trim())
        if (otherCompany.trim()) formData.append('other_company', otherCompany.trim())
        if (otherDesignation.trim()) formData.append('other_designation', otherDesignation.trim())
        formData.append('other_phone_number', otherPhoneNumber.trim())
        if (otherNote.trim()) formData.append('other_note', otherNote.trim())
      }
      if (linkCategory) formData.append('link_category', linkCategory)
      if (linkCategory === 'purchase') {
        if (purchaseLinkType === 'po' && selectedPurchaseOrderId) formData.append('purchase_order_id', selectedPurchaseOrderId)
        if (purchaseLinkType === 'pr' && selectedPurchaseReceiptId) formData.append('purchase_receipt_id', selectedPurchaseReceiptId)
        if (purchaseLinkType === 'pi' && selectedPurchaseInvoiceId) formData.append('purchase_invoice_id', selectedPurchaseInvoiceId)
      }
      if (linkCategory === 'sale') {
        if (saleLinkType === 'sales_invoice' && selectedSalesInvoiceId) {
          formData.append('dispatch_sales_invoice_id', selectedSalesInvoiceId)
        }
        if (saleLinkType === 'proforma' && selectedSalesOrderId) {
          formData.append('sales_order_id', selectedSalesOrderId)
        }
      }
      if (paymentReceiptFile) formData.append('payment_receipt_file', paymentReceiptFile)
      if (salesInvoiceFile) formData.append('sales_invoice_file', salesInvoiceFile)

      const res = await erpFetch<{ data: { id: string } }>('/api/journal-entries', { method: 'POST', body: formData })
      router.push(`/dashboard/finance/journal-entries/${res.data.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create journal entry')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading create journal entry form...</div>

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/finance/journal-entries">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft size={16} />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Create Journal Entry</h1>
          <p className="text-sm text-muted-foreground">Record a payment received or payment made.</p>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Journal Entry</CardTitle>
          <CardDescription>Created by and created at are captured when you save.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Payment type</Label>
            <ToggleGroup
              type="single"
              value={direction}
              onValueChange={(value) => {
                if (value === 'received' || value === 'made') setDirection(value)
              }}
              variant="outline"
            >
              <ToggleGroupItem value="received" className="px-4">
                Payment received
              </ToggleGroupItem>
              <ToggleGroupItem value="made" className="px-4">
                Payment made
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="space-y-3">
            <Label>Entity</Label>
            <ToggleGroup
              type="single"
              value={entityType}
              onValueChange={(value) => {
                if (value === 'supplier' || value === 'customer' || value === 'employee' || value === 'other') {
                  setEntityType(value)
                  resetEntitySelection()
                }
              }}
              variant="outline"
              className={WRAPPED_TOGGLE_GROUP}
            >
              <ToggleGroupItem value="supplier" className={WRAPPED_TOGGLE_ITEM}>
                Supplier
              </ToggleGroupItem>
              <ToggleGroupItem value="customer" className={WRAPPED_TOGGLE_ITEM}>
                Customer
              </ToggleGroupItem>
              <ToggleGroupItem value="employee" className={WRAPPED_TOGGLE_ITEM}>
                Employee
              </ToggleGroupItem>
              <ToggleGroupItem value="other" className={WRAPPED_TOGGLE_ITEM}>
                Other
              </ToggleGroupItem>
            </ToggleGroup>

            {entityType === 'other' ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="other-name">Name *</Label>
                  <Input id="other-name" value={otherName} onChange={(e) => setOtherName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="other-phone">Phone Number *</Label>
                  <Input id="other-phone" value={otherPhoneNumber} onChange={(e) => setOtherPhoneNumber(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="other-company">Company</Label>
                  <Input id="other-company" value={otherCompany} onChange={(e) => setOtherCompany(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="other-designation">Designation</Label>
                  <Input id="other-designation" value={otherDesignation} onChange={(e) => setOtherDesignation(e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="other-note">Note</Label>
                  <Textarea id="other-note" value={otherNote} onChange={(e) => setOtherNote(e.target.value)} />
                </div>
              </div>
            ) : (
              <>
                <Input
                  placeholder={
                    entityType === 'supplier'
                      ? 'Search suppliers...'
                      : entityType === 'customer'
                        ? 'Search customers...'
                        : 'Search employees...'
                  }
                  value={entitySearch}
                  onChange={(e) => {
                    setEntitySearch(e.target.value)
                    if (entityType === 'supplier') setSelectedSupplierId('')
                    if (entityType === 'customer') setSelectedCustomerId('')
                    if (entityType === 'employee') setSelectedEmployeeId('')
                  }}
                />
                <div className="max-h-40 space-y-1 overflow-auto rounded-md border p-2">
                  {entityType === 'supplier'
                    ? filteredSuppliers.map((supplier) => (
                        <button
                          key={supplier.id}
                          type="button"
                          className={`block w-full rounded px-2 py-1 text-left text-sm hover:bg-muted ${selectedSupplierId === supplier.id ? 'bg-muted font-medium' : ''}`}
                          onClick={() => chooseSupplier(supplier)}
                        >
                          {supplier.supplier_code ? `${supplier.supplier_code} - ` : ''}
                          {supplier.name ?? supplier.id}
                        </button>
                      ))
                    : null}
                  {entityType === 'customer'
                    ? filteredCustomers.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          className={`block w-full rounded px-2 py-1 text-left text-sm hover:bg-muted ${selectedCustomerId === customer.id ? 'bg-muted font-medium' : ''}`}
                          onClick={() => chooseCustomer(customer)}
                        >
                          {customer.name ?? customer.id}
                        </button>
                      ))
                    : null}
                  {entityType === 'employee'
                    ? filteredEmployees.map((employee) => (
                        <button
                          key={employee.id}
                          type="button"
                          className={`block w-full rounded px-2 py-1 text-left text-sm hover:bg-muted ${selectedEmployeeId === employee.id ? 'bg-muted font-medium' : ''}`}
                          onClick={() => chooseEmployee(employee)}
                        >
                          {employee.employee_code ? `${employee.employee_code} - ` : ''}
                          {employee.full_name ?? employee.id}
                        </button>
                      ))
                    : null}
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="transaction-date">Date of Transaction</Label>
              <Input id="transaction-date" type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="journal-amount">Total Amount of Transaction</Label>
              <Input id="journal-amount" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="journal-description">Description</Label>
            <Textarea id="journal-description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="payment-receipt">Payment Receipt</Label>
              <Input
                id="payment-receipt"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                onChange={(e) => setPaymentReceiptFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sales-invoice-file">Sales Invoice</Label>
              <Input
                id="sales-invoice-file"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                onChange={(e) => setSalesInvoiceFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Link to</Label>
            <ToggleGroup
              type="single"
              value={linkCategory || undefined}
              onValueChange={(value) => {
                if (
                  value === 'purchase' ||
                  value === 'sale' ||
                  value === 'maintenance' ||
                  value === 'hr' ||
                  value === 'business_event' ||
                  value === 'miscellaneous'
                ) {
                  setLinkCategory(value)
                } else {
                  setLinkCategory('')
                }
              }}
              variant="outline"
              className={WRAPPED_TOGGLE_GROUP}
            >
              <ToggleGroupItem value="purchase" className={WRAPPED_TOGGLE_ITEM}>
                Purchase
              </ToggleGroupItem>
              <ToggleGroupItem value="sale" className={WRAPPED_TOGGLE_ITEM}>
                Sale
              </ToggleGroupItem>
              <ToggleGroupItem value="maintenance" className={WRAPPED_TOGGLE_ITEM}>
                Maintenance
              </ToggleGroupItem>
              <ToggleGroupItem value="hr" className={WRAPPED_TOGGLE_ITEM}>
                HR
              </ToggleGroupItem>
              <ToggleGroupItem value="business_event" className={WRAPPED_TOGGLE_ITEM}>
                Business Event
              </ToggleGroupItem>
              <ToggleGroupItem value="miscellaneous" className={WRAPPED_TOGGLE_ITEM}>
                Miscellaneous
              </ToggleGroupItem>
            </ToggleGroup>

            {linkCategory === 'purchase' ? (
              <div className="space-y-3 rounded-md border p-4">
                <ToggleGroup
                  type="single"
                  value={purchaseLinkType}
                  onValueChange={(value) => {
                    if (value === 'po' || value === 'pr' || value === 'pi') setPurchaseLinkType(value)
                  }}
                  variant="outline"
                >
                  <ToggleGroupItem value="po">PO</ToggleGroupItem>
                  <ToggleGroupItem value="pr">PR</ToggleGroupItem>
                  <ToggleGroupItem value="pi">PI</ToggleGroupItem>
                </ToggleGroup>
                {purchaseLinkType === 'po' ? (
                  <>
                    <Input placeholder="Search PO..." value={poSearch} onChange={(e) => setPoSearch(e.target.value)} />
                    <div className="max-h-40 space-y-1 overflow-auto rounded-md border p-2">
                      {filteredPurchaseOrders.map((row) => (
                        <button
                          key={row.id}
                          type="button"
                          className={`block w-full rounded px-2 py-1 text-left text-sm hover:bg-muted ${selectedPurchaseOrderId === row.id ? 'bg-muted font-medium' : ''}`}
                          onClick={() => {
                            setSelectedPurchaseOrderId(row.id)
                            setPoSearch(row.po_number ?? row.id)
                          }}
                        >
                          {row.po_number ?? row.id}
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}
                {purchaseLinkType === 'pr' ? (
                  <>
                    <Input placeholder="Search PR..." value={prSearch} onChange={(e) => setPrSearch(e.target.value)} />
                    <div className="max-h-40 space-y-1 overflow-auto rounded-md border p-2">
                      {filteredPurchaseReceipts.map((row) => (
                        <button
                          key={row.id}
                          type="button"
                          className={`block w-full rounded px-2 py-1 text-left text-sm hover:bg-muted ${selectedPurchaseReceiptId === row.id ? 'bg-muted font-medium' : ''}`}
                          onClick={() => {
                            setSelectedPurchaseReceiptId(row.id)
                            setPrSearch(row.pr_number ?? row.id)
                          }}
                        >
                          {row.pr_number ?? row.id}
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}
                {purchaseLinkType === 'pi' ? (
                  <>
                    <Input placeholder="Search PI..." value={piSearch} onChange={(e) => setPiSearch(e.target.value)} />
                    <div className="max-h-40 space-y-1 overflow-auto rounded-md border p-2">
                      {filteredPurchaseInvoices.map((row) => (
                        <button
                          key={row.id}
                          type="button"
                          className={`block w-full rounded px-2 py-1 text-left text-sm hover:bg-muted ${selectedPurchaseInvoiceId === row.id ? 'bg-muted font-medium' : ''}`}
                          onClick={() => {
                            setSelectedPurchaseInvoiceId(row.id)
                            setPiSearch(row.pi_number)
                          }}
                        >
                          {row.pi_number}
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}

            {linkCategory === 'sale' ? (
              <div className="space-y-3 rounded-md border p-4">
                <ToggleGroup
                  type="single"
                  value={saleLinkType}
                  onValueChange={(value) => {
                    if (value === 'sales_invoice' || value === 'proforma') setSaleLinkType(value)
                  }}
                  variant="outline"
                >
                  <ToggleGroupItem value="sales_invoice">Sales Invoice</ToggleGroupItem>
                  <ToggleGroupItem value="proforma">Proforma Invoice</ToggleGroupItem>
                </ToggleGroup>
                {saleLinkType === 'sales_invoice' ? (
                  <>
                    <Input placeholder="Search sales invoice..." value={siSearch} onChange={(e) => setSiSearch(e.target.value)} />
                    <div className="max-h-40 space-y-1 overflow-auto rounded-md border p-2">
                      {filteredSalesInvoices.map((row) => (
                        <button
                          key={row.id}
                          type="button"
                          className={`block w-full rounded px-2 py-1 text-left text-sm hover:bg-muted ${selectedSalesInvoiceId === row.id ? 'bg-muted font-medium' : ''}`}
                          onClick={() => {
                            setSelectedSalesInvoiceId(row.id)
                            setSiSearch(row.invoice_number ?? row.id)
                          }}
                        >
                          {row.invoice_number ?? row.id}
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}
                {saleLinkType === 'proforma' ? (
                  <>
                    <Input placeholder="Search sales order for proforma..." value={soSearch} onChange={(e) => setSoSearch(e.target.value)} />
                    <div className="max-h-40 space-y-1 overflow-auto rounded-md border p-2">
                      {filteredSalesOrders.map((row) => (
                        <button
                          key={row.id}
                          type="button"
                          className={`block w-full rounded px-2 py-1 text-left text-sm hover:bg-muted ${selectedSalesOrderId === row.id ? 'bg-muted font-medium' : ''}`}
                          onClick={() => {
                            setSelectedSalesOrderId(row.id)
                            setSoSearch(row.order_number ?? row.id)
                          }}
                        >
                          {row.order_number ?? row.id}
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Created by</Label>
              <Input value={createdByLabel} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Created at</Label>
              <Input value={createdAtLabel} readOnly />
            </div>
          </div>

          <Button onClick={() => void save()} disabled={saving}>
            {saving ? 'Creating...' : 'Create'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
