'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type SupplierDetails = {
  id?: string | null
  name?: string | null
  supplier_code?: string | null
  bank_name_on_account?: string | null
  bank_name?: string | null
  bank_branch?: string | null
  bank_account_number?: string | null
  ifsc_code?: string | null
}

type PurchaseInvoiceLine = {
  line_total?: number | null
}

type PurchaseInvoiceDetail = {
  id: string
  pi_number: string
  status: string
  suppliers?: SupplierDetails | null
  purchase_invoice_lines?: PurchaseInvoiceLine[] | null
}

type MeUser = {
  firstName?: string | null
  lastName?: string | null
  email?: string | null
}

function toLocalYmd(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function RecordPurchaseInvoicePaymentPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [invoice, setInvoice] = useState<PurchaseInvoiceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(toLocalYmd(new Date()))
  const [depositedNameOnAccount, setDepositedNameOnAccount] = useState('')
  const [depositedBankName, setDepositedBankName] = useState('')
  const [depositedAccountNumber, setDepositedAccountNumber] = useState('')
  const [depositedIfscCode, setDepositedIfscCode] = useState('')
  const [paymentReceiptFile, setPaymentReceiptFile] = useState<File | null>(null)
  const [createdByLabel, setCreatedByLabel] = useState('—')
  const [createdAtLabel, setCreatedAtLabel] = useState('—')

  const payableTotal = useMemo(() => {
    const lines = invoice?.purchase_invoice_lines ?? []
    const subTotal = lines.reduce((sum, line) => sum + Number(line.line_total ?? 0), 0)
    const gstAmount = Math.round(subTotal * 0.18 * 100) / 100
    return Math.round((subTotal + gstAmount) * 100) / 100
  }, [invoice?.purchase_invoice_lines])

  const supplierLabel = useMemo(() => {
    const supplier = invoice?.suppliers
    if (!supplier) return '—'
    const code = supplier.supplier_code?.trim()
    return `${code ? `${code} - ` : ''}${supplier.name ?? ''}`
  }, [invoice?.suppliers])

  useEffect(() => {
    void load()
  }, [params.id])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [invoiceRes, meRes] = await Promise.all([
        erpFetch<{ data: PurchaseInvoiceDetail }>(`/api/purchase/invoices/${params.id}`),
        erpFetch<{ user: MeUser }>('/api/me'),
      ])
      const invoiceData = invoiceRes.data
      if (invoiceData.status === 'paid') {
        router.replace(`/dashboard/finance/purchase-invoices/${params.id}`)
        return
      }
      if (invoiceData.status === 'cancelled') {
        setError('Cancelled purchase invoices cannot be paid.')
        setInvoice(invoiceData)
        return
      }
      setInvoice(invoiceData)

      const lines = invoiceData.purchase_invoice_lines ?? []
      const subTotal = lines.reduce((sum, line) => sum + Number(line.line_total ?? 0), 0)
      const gstAmount = Math.round(subTotal * 0.18 * 100) / 100
      const total = Math.round((subTotal + gstAmount) * 100) / 100
      setAmount(total > 0 ? total.toFixed(2) : '')

      const supplier = invoiceData.suppliers
      setDepositedNameOnAccount(supplier?.bank_name_on_account ?? '')
      setDepositedBankName(supplier?.bank_name ?? supplier?.bank_branch ?? '')
      setDepositedAccountNumber(supplier?.bank_account_number ?? '')
      setDepositedIfscCode(supplier?.ifsc_code ?? '')

      const user = meRes.user
      const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
      setCreatedByLabel(name || user.email || '—')
      setCreatedAtLabel(new Date().toLocaleString('en-IN'))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load purchase invoice')
    } finally {
      setLoading(false)
    }
  }

  const save = async () => {
    if (!invoice) return
    const normalizedAmount = Number(amount)
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      setError('Payment amount must be greater than 0.')
      return
    }
    if (!paymentDate.trim()) {
      setError('Payment date is required.')
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
      formData.append('deposited_name_on_account', depositedNameOnAccount.trim())
      formData.append('deposited_bank_name', depositedBankName.trim())
      formData.append('deposited_account_number', depositedAccountNumber.trim())
      formData.append('deposited_ifsc_code', depositedIfscCode.trim())
      if (paymentReceiptFile) formData.append('payment_receipt_file', paymentReceiptFile)

      const res = await erpFetch<{ data: { id: string } }>(`/api/purchase/invoices/${invoice.id}/record-payment`, {
        method: 'POST',
        body: formData,
      })
      router.push(`/dashboard/finance/payment-entries/${res.data.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to record payment')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading record payment form...</div>
  if (!invoice && error) return <div className="p-8 text-sm text-red-600">{error}</div>

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/finance/purchase-invoices/${params.id}`}>
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft size={16} />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Record Payment</h1>
          {invoice?.pi_number ? <p className="text-sm text-muted-foreground">{invoice.pi_number}</p> : null}
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Payment Entry</CardTitle>
          <CardDescription>
            This payment is saved as a payment entry. Payable total including GST: ₹{payableTotal.toFixed(2)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="payment-amount">Payment Amount</Label>
              <Input
                id="payment-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-date">Payment Date</Label>
              <Input id="payment-date" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Entity</Label>
            <Input value={supplierLabel} readOnly />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Deposited to</p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="deposited-name">Name on Account</Label>
                <Input
                  id="deposited-name"
                  value={depositedNameOnAccount}
                  onChange={(e) => setDepositedNameOnAccount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deposited-bank">Bank</Label>
                <Input id="deposited-bank" value={depositedBankName} onChange={(e) => setDepositedBankName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deposited-account-number">Account Number</Label>
                <Input
                  id="deposited-account-number"
                  value={depositedAccountNumber}
                  onChange={(e) => setDepositedAccountNumber(e.target.value)}
                />
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

          <Button onClick={() => void save()} disabled={saving || !invoice}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
