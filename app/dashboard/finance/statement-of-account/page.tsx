'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Search } from 'lucide-react'
import { erpFetch } from '@/lib/erp-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Supplier = {
  id: string
  name?: string | null
  supplier_code?: string | null
}

type Customer = {
  id: string
  name?: string | null
}

type EntityOption =
  | { kind: 'supplier'; id: string; label: string }
  | { kind: 'customer'; id: string; label: string }

export default function StatementOfAccountPage() {
  const router = useRouter()
  const [loadingEntities, setLoadingEntities] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [entitySearch, setEntitySearch] = useState('')
  const [entityOptions, setEntityOptions] = useState<EntityOption[]>([])
  const [selectedEntity, setSelectedEntity] = useState<EntityOption | null>(null)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  useEffect(() => {
    void loadEntities()
  }, [])

  const filteredEntities = useMemo(() => {
    const term = entitySearch.trim().toLowerCase()
    if (!term) return entityOptions
    return entityOptions.filter((option) => option.label.toLowerCase().includes(term))
  }, [entityOptions, entitySearch])

  const loadEntities = async () => {
    setLoadingEntities(true)
    setError(null)
    try {
      const [suppliersRes, customersRes] = await Promise.all([
        erpFetch<{ data: Supplier[] }>('/api/suppliers'),
        erpFetch<{ data: Customer[] }>('/api/customers?limit=100'),
      ])
      const options: EntityOption[] = [
        ...(suppliersRes.data ?? []).map((supplier) => ({
          kind: 'supplier' as const,
          id: supplier.id,
          label: `${supplier.supplier_code ? `${supplier.supplier_code} - ` : ''}${supplier.name ?? supplier.id}`,
        })),
        ...(customersRes.data ?? []).map((customer) => ({
          kind: 'customer' as const,
          id: customer.id,
          label: customer.name ?? customer.id,
        })),
      ]
      setEntityOptions(options)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load entities')
    } finally {
      setLoadingEntities(false)
    }
  }

  const chooseEntity = (option: EntityOption) => {
    setSelectedEntity(option)
    setEntitySearch(option.label)
  }

  const generate = () => {
    if (!selectedEntity) {
      setError('Choose a supplier or customer before generating the statement.')
      return
    }
    if (fromDate && toDate && fromDate > toDate) {
      setError('From date must be on or before to date.')
      return
    }

    setError(null)
    const params = new URLSearchParams({
      entity_type: selectedEntity.kind,
      entity_id: selectedEntity.id,
    })
    if (fromDate) params.set('from', fromDate)
    if (toDate) params.set('to', toDate)
    router.push(`/dashboard/finance/statement-of-account/view?${params.toString()}`)
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/finance">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft size={16} />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Statement of Account</h1>
          <p className="text-sm text-muted-foreground">Choose an entity, optionally limit the date range, then generate the statement.</p>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Generate statement</CardTitle>
          <CardDescription>Search a supplier or customer, optionally choose a date range, then generate.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-medium">Entity</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search suppliers and customers..."
                value={entitySearch}
                onChange={(e) => {
                  setEntitySearch(e.target.value)
                  if (selectedEntity && e.target.value !== selectedEntity.label) {
                    setSelectedEntity(null)
                  }
                }}
              />
            </div>
            <div className="max-h-48 space-y-1 overflow-auto rounded-md border p-2">
              {loadingEntities ? (
                <p className="px-2 py-1 text-sm text-muted-foreground">Loading entities...</p>
              ) : filteredEntities.length === 0 ? (
                <p className="px-2 py-1 text-sm text-muted-foreground">No entities match your search.</p>
              ) : (
                filteredEntities.map((option) => (
                  <button
                    key={`${option.kind}-${option.id}`}
                    type="button"
                    className={`block w-full rounded px-2 py-1 text-left text-sm hover:bg-muted ${selectedEntity?.id === option.id && selectedEntity.kind === option.kind ? 'bg-muted font-medium' : ''}`}
                    onClick={() => chooseEntity(option)}
                  >
                    {option.kind === 'supplier' ? 'Supplier' : 'Customer'}: {option.label}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="statement-from-date">From date (optional)</Label>
              <Input id="statement-from-date" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="statement-to-date">To date (optional)</Label>
              <Input id="statement-to-date" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>

          <Button onClick={generate} disabled={!selectedEntity}>
            Generate
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
