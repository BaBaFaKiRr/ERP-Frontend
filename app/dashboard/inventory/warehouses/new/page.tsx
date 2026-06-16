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
import { Checkbox } from '@/components/ui/checkbox'

type MeUser = {
  firstName?: string | null
  lastName?: string | null
  email?: string | null
}

export default function NewWarehousePage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [line1, setLine1] = useState('')
  const [city, setCity] = useState('')
  const [state, setStateVal] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [country, setCountry] = useState('India')
  const [notes, setNotes] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [createdByLabel, setCreatedByLabel] = useState('—')

  useEffect(() => {
    void erpFetch<{ user: MeUser }>('/api/me')
      .then((res) => {
        const label = `${res.user.firstName ?? ''} ${res.user.lastName ?? ''}`.trim()
        setCreatedByLabel(label || res.user.email || '—')
      })
      .catch(() => setCreatedByLabel('—'))
  }, [])

  const save = async () => {
    if (!name.trim()) {
      setError('Warehouse name is required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await erpFetch('/api/warehouses', {
        method: 'POST',
        body: {
          name: name.trim(),
          code: code.trim() || undefined,
          address: {
            line1: line1.trim() || undefined,
            city: city.trim() || undefined,
            state: state.trim() || undefined,
            postal_code: postalCode.trim() || undefined,
            country: country.trim() || undefined,
          },
          notes: notes.trim() || undefined,
          is_default: isDefault,
        },
      })
      router.push('/dashboard/inventory/warehouses')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create warehouse')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/inventory/warehouses" aria-label="Back">
            <ArrowLeft size={20} />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Add warehouse</h1>
          <p className="text-sm text-muted-foreground">Define a storage location for inventory.</p>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive mb-4">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Warehouse details</CardTitle>
          <CardDescription>Only admins can create warehouses.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="warehouse-name">Name *</Label>
            <Input
              id="warehouse-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mumbai Distribution Center"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="warehouse-code">Code</Label>
            <Input
              id="warehouse-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. WH-MUM"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="line1">Address line</Label>
            <Input id="line1" value={line1} onChange={(e) => setLine1(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" value={state} onChange={(e) => setStateVal(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="postal">Postal code</Label>
              <Input id="postal" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={isDefault} onCheckedChange={(v) => setIsDefault(v === true)} />
            Set as default warehouse
          </label>
          <div className="grid gap-2">
            <Label>Created by</Label>
            <Input value={createdByLabel} readOnly />
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? 'Creating…' : 'Create warehouse'}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/inventory/warehouses">Cancel</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
