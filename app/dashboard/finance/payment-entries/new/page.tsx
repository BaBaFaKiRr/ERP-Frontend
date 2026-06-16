'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type PaymentAccount = {
  id: string
  name: string
  purpose: string
}

type PurchaseOrder = {
  id: string
  po_number?: string | null
  suppliers?: { name?: string | null } | null
}

type SalesInvoice = {
  id: string
  invoice_number?: string | null
  status?: string | null
}

type Employee = {
  id: string
  full_name?: string | null
  employee_code?: string | null
}

type MeUser = {
  role?: string | null
  firstName?: string | null
  lastName?: string | null
  email?: string | null
}

type Direction = 'made' | 'received'
type AgainstType = 'sales_invoice' | 'purchase_order' | 'general_entry' | 'wages' | 'miscellaneous'

function toLocalYmd(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function NewPaymentEntryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading payment entry form…</div>}>
      <NewPaymentEntryContent />
    </Suspense>
  )
}

function NewPaymentEntryContent() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [paymentAccountId, setPaymentAccountId] = useState('')
  const [accountSearch, setAccountSearch] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(toLocalYmd(new Date()))
  const [direction, setDirection] = useState<Direction>('made')
  const [againstType, setAgainstType] = useState<AgainstType>('sales_invoice')
  const [poSearch, setPoSearch] = useState('')
  const [siSearch, setSiSearch] = useState('')
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [selectedPurchaseOrderId, setSelectedPurchaseOrderId] = useState('')
  const [selectedSalesInvoiceId, setSelectedSalesInvoiceId] = useState('')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [generalPartyName, setGeneralPartyName] = useState('')
  const [generalPartyDetails, setGeneralPartyDetails] = useState('')
  const [miscTitle, setMiscTitle] = useState('')
  const [miscDescription, setMiscDescription] = useState('')
  const [paymentReceiptFile, setPaymentReceiptFile] = useState<File | null>(null)
  const [createdByLabel, setCreatedByLabel] = useState('—')

  useEffect(() => {
    void load()
  }, [])

  const selectedAccount = useMemo(
    () => paymentAccounts.find((a) => a.id === paymentAccountId) ?? null,
    [paymentAccounts, paymentAccountId],
  )

  const filteredPaymentAccounts = useMemo(() => {
    const term = accountSearch.trim().toLowerCase()
    if (!term) return paymentAccounts
    return paymentAccounts.filter((row) => {
      const label = `${row.name} ${row.purpose}`.toLowerCase()
      return label.includes(term)
    })
  }, [paymentAccounts, accountSearch])

  const filteredPurchaseOrders = useMemo(() => {
    const term = poSearch.trim().toLowerCase()
    if (!term) return purchaseOrders
    return purchaseOrders.filter((row) => {
      const label = `${row.po_number ?? ''} ${row.suppliers?.name ?? ''}`.toLowerCase()
      return label.includes(term)
    })
  }, [purchaseOrders, poSearch])

  const filteredSalesInvoices = useMemo(() => {
    const term = siSearch.trim().toLowerCase()
    if (!term) return salesInvoices
    return salesInvoices.filter((row) => (row.invoice_number ?? '').toLowerCase().includes(term))
  }, [salesInvoices, siSearch])

  const filteredEmployees = useMemo(() => {
    const term = employeeSearch.trim().toLowerCase()
    if (!term) return employees
    return employees.filter((row) => {
      const label = `${row.employee_code ?? ''} ${row.full_name ?? ''}`.toLowerCase()
      return label.includes(term)
    })
  }, [employees, employeeSearch])

  const generalPartyLabel = direction === 'made' ? 'Payee' : 'Payer'

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [accountsRes, meRes] = await Promise.all([
        erpFetch<{ data: PaymentAccount[] }>('/api/payment-accounts'),
        erpFetch<{ user: MeUser }>('/api/me'),
      ])
      const accounts = accountsRes.data ?? []
      setPaymentAccounts(accounts)
      setIsAdmin(meRes.user.role === 'admin')
      const name = `${meRes.user.firstName ?? ''} ${meRes.user.lastName ?? ''}`.trim()
      setCreatedByLabel(name || meRes.user.email || '—')
      if (accounts.length > 0) {
        setPaymentAccountId((prev) => prev || accounts[0].id)
        setAccountSearch((prev) => prev || accounts[0].name)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load payment entry form')
    } finally {
      setLoading(false)
    }
  }

  const loadAgainstData = async (type: AgainstType) => {
    try {
      if (type === 'purchase_order' && purchaseOrders.length === 0) {
        const res = await erpFetch<{ data: PurchaseOrder[] }>('/api/purchase/orders')
        setPurchaseOrders(res.data ?? [])
      }
      if (type === 'sales_invoice' && salesInvoices.length === 0) {
        const res = await erpFetch<{ data: SalesInvoice[] }>('/api/dispatch-sales-invoices')
        setSalesInvoices(res.data ?? [])
      }
      if (type === 'wages' && employees.length === 0) {
        const res = await erpFetch<{ data: Employee[] }>('/api/employees')
        setEmployees(res.data ?? [])
      }
    } catch {
      // Keep form usable if reference lists fail.
    }
  }

  useEffect(() => {
    void loadAgainstData(againstType)
  }, [againstType])

  const resetAgainstSelections = () => {
    setSelectedPurchaseOrderId('')
    setSelectedSalesInvoiceId('')
    setSelectedEmployeeId('')
    setPoSearch('')
    setSiSearch('')
    setEmployeeSearch('')
    setGeneralPartyName('')
    setGeneralPartyDetails('')
    setMiscTitle('')
    setMiscDescription('')
  }

  const save = async () => {
    const normalizedAmount = Number(amount)
    if (!paymentAccountId) {
      setError('Select a payment account to continue.')
      return
    }
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      setError('Payment amount must be greater than 0.')
      return
    }
    if (!paymentDate.trim()) {
      setError('Payment date is required.')
      return
    }
    if (againstType === 'sales_invoice' && !selectedSalesInvoiceId) {
      setError('Select a sales invoice.')
      return
    }
    if (againstType === 'purchase_order' && !selectedPurchaseOrderId) {
      setError('Select a purchase order.')
      return
    }
    if (againstType === 'general_entry' && !generalPartyName.trim()) {
      setError(`${generalPartyLabel} name is required.`)
      return
    }
    if (againstType === 'wages' && !selectedEmployeeId) {
      setError('Select an employee.')
      return
    }
    if (againstType === 'miscellaneous' && !miscTitle.trim()) {
      setError('Payment title is required.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('amount', String(normalizedAmount))
      formData.append('payment_date', paymentDate)
      formData.append('payment_account_id', paymentAccountId)
      formData.append('direction', direction)
      formData.append('against_type', againstType)
      if (selectedSalesInvoiceId) formData.append('dispatch_sales_invoice_id', selectedSalesInvoiceId)
      if (selectedPurchaseOrderId) formData.append('purchase_order_id', selectedPurchaseOrderId)
      if (selectedEmployeeId) formData.append('employee_id', selectedEmployeeId)
      if (generalPartyName.trim()) formData.append('general_party_name', generalPartyName.trim())
      if (generalPartyDetails.trim()) formData.append('general_party_details', generalPartyDetails.trim())
      if (miscTitle.trim()) formData.append('misc_title', miscTitle.trim())
      if (miscDescription.trim()) formData.append('misc_description', miscDescription.trim())
      if (paymentReceiptFile) formData.append('payment_receipt_file', paymentReceiptFile)

      const res = await erpFetch<{ data: { id: string } }>('/api/payment-entries', {
        method: 'POST',
        body: formData,
      })
      router.push(`/dashboard/finance/payment-entries/${res.data.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create payment entry')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading payment entry form…</div>
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/finance/payment-entries" aria-label="Back">
            <ArrowLeft size={20} />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold">Add payment entry</h1>
          <p className="text-muted-foreground mt-1">Record inward or outward payments against business documents.</p>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive mb-4">{error}</p> : null}

      {paymentAccounts.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No payment accounts yet</CardTitle>
            <CardDescription>
              Create a payment account before recording payment entries.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isAdmin ? (
              <Button asChild>
                <Link href="/dashboard/finance/payment-accounts/new">
                  <Plus className="size-4 mr-2" />
                  Create payment account
                </Link>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">Ask an admin to create a payment account first.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void save()
          }}
          className="grid grid-cols-1 xl:grid-cols-12 gap-6"
        >
          <div className="xl:col-span-8 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment details</CardTitle>
                <CardDescription>Choose a payment account, then enter amount and type.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 rounded-md border p-3 bg-muted/20">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Payment account *</Label>
                    {isAdmin ? (
                      <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
                        <Link href="/dashboard/finance/payment-accounts/new">
                          <Plus className="size-3.5 mr-1" />
                          Create account
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                  <Input
                    placeholder="Search payment account…"
                    value={accountSearch}
                    onChange={(e) => {
                      setAccountSearch(e.target.value)
                      if (paymentAccountId) setPaymentAccountId('')
                    }}
                  />
                  <div className="max-h-44 overflow-auto rounded border bg-background">
                    {filteredPaymentAccounts.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-muted-foreground">No matching payment accounts.</p>
                    ) : (
                      filteredPaymentAccounts.map((account) => (
                        <button
                          key={account.id}
                          type="button"
                          className={`block w-full px-3 py-2 text-left text-sm hover:bg-muted border-b last:border-b-0 ${paymentAccountId === account.id ? 'bg-muted font-medium' : ''}`}
                          onClick={() => {
                            setPaymentAccountId(account.id)
                            setAccountSearch(account.name)
                          }}
                        >
                          <span className="font-medium">{account.name}</span>
                          <span className="block text-muted-foreground text-xs mt-0.5">{account.purpose}</span>
                        </button>
                      ))
                    )}
                  </div>
                  {selectedAccount ? (
                    <p className="text-xs text-muted-foreground">
                      Selected: <span className="font-medium text-foreground">{selectedAccount.name}</span>
                    </p>
                  ) : (
                    <p className="text-xs text-destructive">Select a payment account to continue.</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="payment-amount">Payment amount</Label>
                    <Input
                      id="payment-amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="payment-date">Payment date</Label>
                    <Input
                      id="payment-date"
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Payment type</Label>
                  <Select value={direction} onValueChange={(v) => setDirection(v as Direction)}>
                    <SelectTrigger className="w-full sm:max-w-md">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="made">Payment Made (Outward “−”)</SelectItem>
                      <SelectItem value="received">Payment Received (Inward “+”)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Against</CardTitle>
                <CardDescription>What this payment is linked to.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Against</Label>
                  <Select
                    value={againstType}
                    onValueChange={(v) => {
                      setAgainstType(v as AgainstType)
                      resetAgainstSelections()
                    }}
                  >
                    <SelectTrigger className="w-full sm:max-w-md">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales_invoice">Sales Invoice</SelectItem>
                      <SelectItem value="purchase_order">Purchase Order</SelectItem>
                      <SelectItem value="general_entry">General Entry</SelectItem>
                      <SelectItem value="wages">Wages</SelectItem>
                      <SelectItem value="miscellaneous">Miscellaneous</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {againstType === 'sales_invoice' ? (
                  <div className="space-y-3 rounded-md border p-3 bg-muted/20">
                    <Label>Sales invoice</Label>
                    <Input
                      placeholder="Search invoice number…"
                      value={siSearch}
                      onChange={(e) => {
                        setSiSearch(e.target.value)
                        if (selectedSalesInvoiceId) setSelectedSalesInvoiceId('')
                      }}
                    />
                    <div className="max-h-44 overflow-auto rounded border bg-background">
                      {filteredSalesInvoices.map((inv) => (
                        <button
                          key={inv.id}
                          type="button"
                          className={`block w-full px-3 py-2 text-left text-sm hover:bg-muted border-b last:border-b-0 ${selectedSalesInvoiceId === inv.id ? 'bg-muted font-medium' : ''}`}
                          onClick={() => {
                            setSelectedSalesInvoiceId(inv.id)
                            setSiSearch(inv.invoice_number ?? inv.id)
                          }}
                        >
                          <span className="font-mono">{inv.invoice_number ?? inv.id}</span>
                          {inv.status ? (
                            <span className="text-muted-foreground ml-2">{inv.status}</span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {againstType === 'purchase_order' ? (
                  <div className="space-y-3 rounded-md border p-3 bg-muted/20">
                    <Label>Purchase order</Label>
                    <Input
                      placeholder="Search PO number or supplier…"
                      value={poSearch}
                      onChange={(e) => {
                        setPoSearch(e.target.value)
                        if (selectedPurchaseOrderId) setSelectedPurchaseOrderId('')
                      }}
                    />
                    <div className="max-h-44 overflow-auto rounded border bg-background">
                      {filteredPurchaseOrders.map((po) => (
                        <button
                          key={po.id}
                          type="button"
                          className={`block w-full px-3 py-2 text-left text-sm hover:bg-muted border-b last:border-b-0 ${selectedPurchaseOrderId === po.id ? 'bg-muted font-medium' : ''}`}
                          onClick={() => {
                            setSelectedPurchaseOrderId(po.id)
                            setPoSearch(po.po_number ?? po.id)
                          }}
                        >
                          <span className="font-mono">{po.po_number ?? po.id}</span>
                          {po.suppliers?.name ? (
                            <span className="text-muted-foreground ml-2">{po.suppliers.name}</span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {againstType === 'general_entry' ? (
                  <div className="grid gap-4 rounded-md border p-3 bg-muted/20">
                    <div className="grid gap-2">
                      <Label htmlFor="general-party-name">{generalPartyLabel} name *</Label>
                      <Input
                        id="general-party-name"
                        value={generalPartyName}
                        onChange={(e) => setGeneralPartyName(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="general-party-details">{generalPartyLabel} details</Label>
                      <Textarea
                        id="general-party-details"
                        value={generalPartyDetails}
                        onChange={(e) => setGeneralPartyDetails(e.target.value)}
                        rows={3}
                        placeholder="Company, phone, note, etc."
                      />
                    </div>
                  </div>
                ) : null}

                {againstType === 'wages' ? (
                  <div className="space-y-3 rounded-md border p-3 bg-muted/20">
                    <Label>Employee</Label>
                    <Input
                      placeholder="Search employee…"
                      value={employeeSearch}
                      onChange={(e) => {
                        setEmployeeSearch(e.target.value)
                        if (selectedEmployeeId) setSelectedEmployeeId('')
                      }}
                    />
                    <div className="max-h-44 overflow-auto rounded border bg-background">
                      {filteredEmployees.map((emp) => (
                        <button
                          key={emp.id}
                          type="button"
                          className={`block w-full px-3 py-2 text-left text-sm hover:bg-muted border-b last:border-b-0 ${selectedEmployeeId === emp.id ? 'bg-muted font-medium' : ''}`}
                          onClick={() => {
                            setSelectedEmployeeId(emp.id)
                            setEmployeeSearch(
                              `${emp.employee_code ? `${emp.employee_code} - ` : ''}${emp.full_name ?? emp.id}`,
                            )
                          }}
                        >
                          {emp.employee_code ? `${emp.employee_code} - ` : ''}
                          {emp.full_name ?? emp.id}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {againstType === 'miscellaneous' ? (
                  <div className="grid gap-4 rounded-md border p-3 bg-muted/20">
                    <div className="grid gap-2">
                      <Label htmlFor="misc-title">Payment title *</Label>
                      <Input id="misc-title" value={miscTitle} onChange={(e) => setMiscTitle(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="misc-description">Description</Label>
                      <Textarea
                        id="misc-description"
                        value={miscDescription}
                        onChange={(e) => setMiscDescription(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Receipt</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  <Label htmlFor="payment-receipt">Upload payment receipt (optional)</Label>
                  <Input
                    id="payment-receipt"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    onChange={(e) => setPaymentReceiptFile(e.target.files?.[0] ?? null)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="xl:col-span-4 space-y-6">
            <Card className="xl:sticky xl:top-6">
              <CardHeader>
                <CardTitle>Summary</CardTitle>
                <CardDescription>Review before saving.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedAccount ? (
                  <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
                    <p className="text-muted-foreground text-xs">Payment account</p>
                    <p className="font-medium">{selectedAccount.name}</p>
                    <p className="text-muted-foreground">{selectedAccount.purpose}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No payment account selected yet.</p>
                )}

                <div className="grid gap-2">
                  <Label>Created by</Label>
                  <Input value={createdByLabel} readOnly />
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t">
                  <Button type="submit" disabled={saving || !paymentAccountId}>
                    {saving ? 'Saving…' : 'Save payment entry'}
                  </Button>
                  <Button type="button" variant="outline" asChild>
                    <Link href="/dashboard/finance/payment-entries">Cancel</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      )}
    </div>
  )
}
