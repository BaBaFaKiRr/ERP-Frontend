'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Customer = {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  gst_number?: string | null
}

export default function CustomerDetailsPage() {
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : ''
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)

  useEffect(() => {
    if (!id) return
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await erpFetch<{ data: Customer }>(`/api/customers/${id}`)
        setCustomer(res.data ?? null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load customer')
        setCustomer(null)
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  if (loading) {
    return <div className="p-8 text-muted-foreground">Loading customer…</div>
  }

  if (error || !customer) {
    return (
      <div className="p-8 space-y-4">
        <Button variant="ghost" asChild>
          <Link href="/dashboard/sales">
            <ArrowLeft className="mr-2 size-4" />
            Back to sales orders
          </Link>
        </Button>
        <p className="text-red-600">{error ?? 'Customer not found'}</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl">
      <Button variant="ghost" asChild className="mb-4">
        <Link href="/dashboard/sales">
          <ArrowLeft className="mr-2 size-4" />
          Back to sales orders
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{customer.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="text-muted-foreground">Email</p>
            <p>{customer.email || '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Phone</p>
            <p>{customer.phone || '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">GST</p>
            <p>{customer.gst_number || '—'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
