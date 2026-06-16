'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type MeUser = {
  firstName?: string | null
  lastName?: string | null
  email?: string | null
}

export default function NewPaymentAccountPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [purpose, setPurpose] = useState('')
  const [createdByLabel, setCreatedByLabel] = useState('—')

  useEffect(() => {
    void erpFetch<{ user: MeUser }>('/api/me')
      .then((res) => {
        const label = `${res.user.firstName ?? ''} ${res.user.lastName ?? ''}`.trim()
        setCreatedByLabel(label || res.user.email || '—')
      })
      .catch(() => {
        setCreatedByLabel('—')
      })
  }, [])

  const save = async () => {
    if (!name.trim() || !purpose.trim()) {
      setError('Name of account and purpose are required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await erpFetch('/api/payment-accounts', {
        method: 'POST',
        body: {
          name: name.trim(),
          purpose: purpose.trim(),
        },
      })
      router.push('/dashboard/finance/payment-accounts')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create payment account')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/finance/payment-accounts" aria-label="Back">
            <ArrowLeft size={20} />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Create Payment Account</h1>
          <p className="text-sm text-muted-foreground">Account used when recording payment entries.</p>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive mb-4">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Account details</CardTitle>
          <CardDescription>Only admins can create payment accounts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="account-name">Name of Account</Label>
            <Input
              id="account-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Main Operating Account"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="purpose">Purpose</Label>
            <Textarea
              id="purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              rows={3}
              placeholder="e.g. Supplier payments and petty cash"
            />
          </div>
          <div className="grid gap-2">
            <Label>Created by</Label>
            <Input value={createdByLabel} readOnly />
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? 'Creating…' : 'Create account'}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/finance/payment-accounts">Cancel</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
