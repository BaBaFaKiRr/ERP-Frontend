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

type Supplier = {
  id: string
  name?: string | null
  supplier_code?: string | null
  bank_name_on_account?: string | null
  bank_name?: string | null
  bank_branch?: string | null
  bank_account_number?: string | null
  ifsc_code?: string | null
}

type Customer = {
  id: string
  name?: string | null
}

type PurchaseInvoice = {
  id: string
  pi_number: string
  status?: string | null
  supplier_id?: string | null
  suppliers?: Supplier | null
}

type MeUser = {
  firstName?: string | null
  lastName?: string | null
  email?: string | null
}

type EntityOption =
  | { kind: 'supplier'; id: string; label: string; supplier: Supplier }
  | { kind: 'customer'; id: string; label: string; customer: Customer }

function toLocalYmd(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function NewPaymentEntryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading add payment entry form...</div>}>
      <NewPaymentEntryContent />
    </Suspense>
  )
}

function NewPaymentEntryContent() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [entitySearch, setEntitySearch] = useState('')
  const [entityOptions, setEntityOptions] = useState<EntityOption[]>([])
  const [selectedEntity, setSelectedEntity] = useState<EntityOption | null>(null)
  const [useOtherEntity, setUseOtherEntity] = useState(false)
  const [otherEntityName, setOtherEntityName] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(toLocalYmd(new Date()))
  const [depositedNameOnAccount, setDepositedNameOnAccount] = useState('')
  const [depositedBankName, setDepositedBankName] = useState('')
  const [depositedAccountNumber, setDepositedAccountNumber] = useState('')
  const [depositedIfscCode, setDepositedIfscCode] = useState('')
  const [paymentReceiptFile, setPaymentReceiptFile] = useState<File | null>(null)
  const [createdByLabel, setCreatedByLabel] = useState('—')
  const [createdAtLabel, setCreatedAtLabel] = useState('—')
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>([])
  const [piSearch, setPiSearch] = useState('')
  const [selectedPurchaseInvoiceId, setSelectedPurchaseInvoiceId] = useState('')

  useEffect(() => {
    void load()
  }, [])

  const filteredEntities = useMemo(() => {
    const term = entitySearch.trim().toLowerCase()
    if (!term) return entityOptions
    return entityOptions.filter((option) => option.label.toLowerCase().includes(term))
  }, [entityOptions, entitySearch])

  const filteredPurchaseInvoices = useMemo(() => {
    const term = piSearch.trim().toLowerCase()
    const eligible = purchaseInvoices.filter((invoice) => invoice.status !== 'cancelled' && invoice.status !== 'paid')
    if (!term) return eligible
    return eligible.filter((invoice) => invoice.pi_number.toLowerCase().includes(term))
  }, [purchaseInvoices, piSearch])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [suppliersRes, customersRes, purchaseInvoicesRes, meRes] = await Promise.all([
        erpFetch<{ data: Supplier[] }>('/api/suppliers'),
        erpFetch<{ data: Customer[] }>('/api/customers?limit=100'),
        erpFetch<{ data: PurchaseInvoice[] }>('/api/purchase/invoices'),
        erpFetch<{ user: MeUser }>('/api/me'),
      ])
      const options: EntityOption[] = [
        ...(suppliersRes.data ?? []).map((supplier) => ({
          kind: 'supplier' as const,
          id: supplier.id,
          label: `${supplier.supplier_code ? `${supplier.supplier_code} - ` : ''}${supplier.name ?? supplier.id}`,
          supplier,
        })),
        ...(customersRes.data ?? []).map((customer) => ({
          kind: 'customer' as const,
          id: customer.id,
          label: customer.name ?? customer.id,
          customer,
        })),
      ]
      setEntityOptions(options)
      setPurchaseInvoices(purchaseInvoicesRes.data ?? [])
      const user = meRes.user
      const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
      setCreatedByLabel(name || user.email || '—')
      setCreatedAtLabel(new Date().toLocaleString('en-IN'))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load payment entry form')
    } finally {
      setLoading(false)
    }
  }

  const applyEntityBank = (option: EntityOption | null) => {
    if (!option || option.kind !== 'supplier') {
      setDepositedNameOnAccount('')
      setDepositedBankName('')
      setDepositedAccountNumber('')
      setDepositedIfscCode('')
      return
    }
    const supplier = option.supplier
    setDepositedNameOnAccount(supplier.bank_name_on_account ?? '')
    setDepositedBankName(supplier.bank_name ?? supplier.bank_branch ?? '')
    setDepositedAccountNumber(supplier.bank_account_number ?? '')
    setDepositedIfscCode(supplier.ifsc_code ?? '')
  }

  const chooseEntity = (option: EntityOption) => {
    setUseOtherEntity(false)
    setOtherEntityName('')
    setSelectedEntity(option)
    setEntitySearch(option.label)
    applyEntityBank(option)
  }

  const enableOtherEntity = () => {
    setUseOtherEntity(true)
    setSelectedEntity(null)
    setEntitySearch('')
    applyEntityBank(null)
  }

  const choosePurchaseInvoice = (invoice: PurchaseInvoice) => {
    setSelectedPurchaseInvoiceId(invoice.id)
    setPiSearch(invoice.pi_number)
    const supplier =
      invoice.suppliers ??
      entityOptions.find((option) => option.kind === 'supplier' && option.id === invoice.supplier_id)?.supplier ??
      null
    if (!supplier) return
    const option: EntityOption = {
      kind: 'supplier',
      id: supplier.id,
      label: `${supplier.supplier_code ? `${supplier.supplier_code} - ` : ''}${supplier.name ?? supplier.id}`,
      supplier,
    }
    setUseOtherEntity(false)
    setOtherEntityName('')
    setSelectedEntity(option)
    setEntitySearch(option.label)
    applyEntityBank(option)
  }

  const clearPurchaseInvoice = () => {
    setSelectedPurchaseInvoiceId('')
    setPiSearch('')
  }

  const save = async () => {
    const normalizedAmount = Number(amount)
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      setError('Payment amount must be greater than 0.')
      return
    }
    if (!paymentDate.trim()) {
      setError('Payment date is required.')
      return
    }
    if (!useOtherEntity && !selectedEntity) {
      setError('Choose an entity or use Other to enter one manually.')
      return
    }
    if (useOtherEntity && !otherEntityName.trim()) {
      setError('Enter the other entity name.')
      return
    }
    if (selectedPurchaseInvoiceId && selectedEntity?.kind === 'customer') {
      setError('Purchase invoice payments must use the invoice supplier or other entity, not a customer.')
      return
    }
    if (!depositedNameOnAccount.trim() || !depositedBankName.trim() || !depositedAccountNumber.trim() || !depositedIfscCode.trim()) {
      setError('All deposited-to bank fields are required.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('amount', String(normalizedAmount))
      formData.append('payment_date', paymentDate)
      if (useOtherEntity) {
        formData.append('entity_name', otherEntityName.trim())
      } else if (selectedEntity?.kind === 'supplier') {
        formData.append('supplier_id', selectedEntity.id)
      } else if (selectedEntity?.kind === 'customer') {
        formData.append('customer_id', selectedEntity.id)
      }
      formData.append('deposited_name_on_account', depositedNameOnAccount.trim())
      formData.append('deposited_bank_name', depositedBankName.trim())
      formData.append('deposited_account_number', depositedAccountNumber.trim())
      formData.append('deposited_ifsc_code', depositedIfscCode.trim())
      if (paymentReceiptFile) formData.append('payment_receipt_file', paymentReceiptFile)
      if (selectedPurchaseInvoiceId) formData.append('purchase_invoice_id', selectedPurchaseInvoiceId)

      const res = await erpFetch<{ data: { id: string } }>('/api/payment-entries', { method: 'POST', body: formData })
      router.push(`/dashboard/finance/payment-entries/${res.data.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create payment entry')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading add payment entry form...</div>

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/finance/payment-entries">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft size={16} />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Add Payment Entry</h1>
          <p className="text-sm text-muted-foreground">Record a payment against a supplier, customer, or other entity.</p>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Payment Entry</CardTitle>
          <CardDescription>Created by and created at are captured when you save.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="payment-amount">Payment Amount</Label>
              <Input id="payment-amount" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-date">Payment Date</Label>
              <Input id="payment-date" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Purchase Invoice (optional)</p>
            <Input
              placeholder="Search purchase invoice by PI number..."
              value={piSearch}
              onChange={(e) => {
                setPiSearch(e.target.value)
                if (selectedPurchaseInvoiceId) setSelectedPurchaseInvoiceId('')
              }}
            />
            <div className="max-h-40 space-y-1 overflow-auto rounded-md border p-2">
              {filteredPurchaseInvoices.map((invoice) => (
                <button
                  key={invoice.id}
                  type="button"
                  className={`block w-full rounded px-2 py-1 text-left text-sm hover:bg-muted ${selectedPurchaseInvoiceId === invoice.id ? 'bg-muted font-medium' : ''}`}
                  onClick={() => choosePurchaseInvoice(invoice)}
                >
                  {invoice.pi_number}
                </button>
              ))}
            </div>
            {selectedPurchaseInvoiceId ? (
              <Button type="button" variant="outline" size="sm" onClick={clearPurchaseInvoice}>
                Clear purchase invoice
              </Button>
            ) : null}
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-medium">Entity</p>
              <Button type="button" variant="outline" size="sm" onClick={enableOtherEntity}>
                Other
              </Button>
            </div>
            {useOtherEntity ? (
              <Input placeholder="Entity name" value={otherEntityName} onChange={(e) => setOtherEntityName(e.target.value)} />
            ) : (
              <>
                <Input placeholder="Search suppliers and customers..." value={entitySearch} onChange={(e) => setEntitySearch(e.target.value)} />
                <div className="max-h-40 space-y-1 overflow-auto rounded-md border p-2">
                  {filteredEntities.map((option) => (
                    <button
                      key={`${option.kind}-${option.id}`}
                      type="button"
                      className={`block w-full rounded px-2 py-1 text-left text-sm hover:bg-muted ${selectedEntity?.id === option.id && selectedEntity.kind === option.kind ? 'bg-muted font-medium' : ''}`}
                      onClick={() => chooseEntity(option)}
                    >
                      {option.kind === 'supplier' ? 'Supplier' : 'Customer'}: {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Deposited to</p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="deposited-name">Name on Account</Label>
                <Input id="deposited-name" value={depositedNameOnAccount} onChange={(e) => setDepositedNameOnAccount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deposited-bank">Bank</Label>
                <Input id="deposited-bank" value={depositedBankName} onChange={(e) => setDepositedBankName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deposited-account-number">Account Number</Label>
                <Input id="deposited-account-number" value={depositedAccountNumber} onChange={(e) => setDepositedAccountNumber(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deposited-ifsc">IFSC Code</Label>
                <Input id="deposited-ifsc" value={depositedIfscCode} onChange={(e) => setDepositedIfscCode(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-receipt">Upload Payment Receipt</Label>
            <Input
              id="payment-receipt"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={(e) => setPaymentReceiptFile(e.target.files?.[0] ?? null)}
            />
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
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
