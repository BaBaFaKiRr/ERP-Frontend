'use client'

import { useEffect, useState } from 'react'
import { EntityActivityLog } from '@/components/entity-activity-log'
import Link from 'next/link'
import { useParams } from 'next/navigation'

import { erpFetch } from '@/lib/erp-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type BomLine = {
  id: string
  line_no: number
  quantity_per: number
  uom: string | null
  unit_cost: number | null
  component_name: string | null
  component_item?: { id: string; sku: string; name: string } | null
}

type BomDetail = {
  id: string
  bom_code: string
  is_active: boolean
  is_default: boolean
  output_quantity: number
  output_uom: string
  description: string | null
  parent_item?: { id: string; sku: string; name: string } | null
  bom_lines: BomLine[]
  total_cost: number
}

export default function BomDetailPage() {
  const params = useParams<{ id: string }>()
  const [detail, setDetail] = useState<BomDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await erpFetch<{ data: BomDetail }>(`/api/bom/id/${params.id}`)
        if (mounted) setDetail(res.data)
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : 'Failed to load BOM')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [params.id])

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">BOM Details</h1>
          <p className="text-muted-foreground mt-1">View BOM header and raw material breakdown.</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/inventory/bom">Back to BOM list</Link>
        </Button>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading BOM...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {detail ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{detail.bom_code}</CardTitle>
              <CardDescription>
                {detail.parent_item ? `${detail.parent_item.sku} - ${detail.parent_item.name}` : '-'}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <p><span className="font-medium">Status:</span> {detail.is_active ? (detail.is_default ? 'Default' : 'Active') : 'Inactive'}</p>
              <p><span className="font-medium">Output:</span> {detail.output_quantity} {detail.output_uom}</p>
              <p className="md:col-span-2"><span className="font-medium">Description:</span> {detail.description || '-'}</p>
              <p><span className="font-medium">Total Cost:</span> ₹{Number(detail.total_cost ?? 0).toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Raw Materials</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sno.</TableHead>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>UOM</TableHead>
                    <TableHead className="text-right">Amount (INR)</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.bom_lines.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7}>No raw materials found.</TableCell>
                    </TableRow>
                  ) : (
                    detail.bom_lines.map((line, idx) => {
                      const total = Number(line.quantity_per || 0) * Number(line.unit_cost || 0)
                      return (
                        <TableRow key={line.id}>
                          <TableCell>{line.line_no ?? idx + 1}</TableCell>
                          <TableCell>{line.component_item?.sku ?? '-'}</TableCell>
                          <TableCell>{line.component_name ?? line.component_item?.name ?? '-'}</TableCell>
                          <TableCell className="text-right">{line.quantity_per}</TableCell>
                          <TableCell>{line.uom ?? '-'}</TableCell>
                          <TableCell className="text-right">{Number(line.unit_cost ?? 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right">{total.toFixed(2)}</TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : null}

      <EntityActivityLog entityType="bom" entityId={detail?.id} />
    </div>
  )
}
