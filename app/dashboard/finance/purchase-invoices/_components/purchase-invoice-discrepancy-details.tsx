'use client'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export type PurchaseInvoiceDiscrepancy = {
  id?: string
  issue_type: string
  sku?: string | null
  item_name?: string | null
  po_unit_price?: number | null
  seller_invoice_unit_price?: number | null
  po_quantity?: number | null
  seller_invoice_quantity?: number | null
  quantity_received?: number | null
  rejection_quantity?: number | null
  notes?: string | null
  items?: { sku?: string | null; name?: string | null } | null
}

const discrepancyLabels: Record<string, string> = {
  price_mismatch: 'Price mismatch',
  qty_mismatch: 'Qty mismatch',
  item_mismatch: 'Item mismatch',
  quality_issue: 'Quality issue',
  other: 'Other issues',
}

export function PurchaseInvoiceDiscrepancyDetails({ discrepancies }: { discrepancies: PurchaseInvoiceDiscrepancy[] }) {
  if (discrepancies.length === 0) {
    return <p className="text-sm text-muted-foreground">No reported issues.</p>
  }

  const grouped = new Map<string, PurchaseInvoiceDiscrepancy[]>()
  for (const row of discrepancies) {
    const existing = grouped.get(row.issue_type) ?? []
    existing.push(row)
    grouped.set(row.issue_type, existing)
  }

  return (
    <div className="space-y-4">
      {Array.from(grouped.entries()).map(([issueType, rows]) => (
        <div key={issueType} className="space-y-2">
          <p className="text-sm font-medium">{discrepancyLabels[issueType] ?? issueType}</p>
          {issueType === 'other' ? (
            rows.map((row, index) => (
              <p key={row.id ?? `${issueType}-${index}`} className="text-sm whitespace-pre-wrap">
                {row.notes ?? '—'}
              </p>
            ))
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Item</TableHead>
                  {issueType === 'price_mismatch' && (
                    <>
                      <TableHead className="text-right">Price on PO</TableHead>
                      <TableHead className="text-right">Price on Sales Invoice</TableHead>
                    </>
                  )}
                  {issueType === 'qty_mismatch' && (
                    <>
                      <TableHead className="text-right">Qty on PO</TableHead>
                      <TableHead className="text-right">Qty on Sales Invoice</TableHead>
                      <TableHead className="text-right">Qty Received</TableHead>
                    </>
                  )}
                  {issueType === 'item_mismatch' && (
                    <>
                      <TableHead className="text-right">Qty Received</TableHead>
                      <TableHead className="text-right">Price on Sales Invoice</TableHead>
                    </>
                  )}
                  {issueType === 'quality_issue' && (
                    <>
                      <TableHead className="text-right">Qty Received</TableHead>
                      <TableHead className="text-right">Rejection Qty</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => {
                  const sku = row.items?.sku ?? row.sku ?? '—'
                  const itemName = row.items?.name ?? row.item_name ?? '—'
                  return (
                    <TableRow key={row.id ?? `${issueType}-${index}`}>
                      <TableCell className="font-mono">{sku}</TableCell>
                      <TableCell>{itemName}</TableCell>
                      {issueType === 'price_mismatch' && (
                        <>
                          <TableCell className="text-right">
                            {row.po_unit_price != null ? `₹${Number(row.po_unit_price).toFixed(2)}` : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.seller_invoice_unit_price != null
                              ? `₹${Number(row.seller_invoice_unit_price).toFixed(2)}`
                              : '—'}
                          </TableCell>
                        </>
                      )}
                      {issueType === 'qty_mismatch' && (
                        <>
                          <TableCell className="text-right">
                            {row.po_quantity != null ? Number(row.po_quantity) : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.seller_invoice_quantity != null ? Number(row.seller_invoice_quantity) : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.quantity_received != null ? Number(row.quantity_received) : '—'}
                          </TableCell>
                        </>
                      )}
                      {issueType === 'item_mismatch' && (
                        <>
                          <TableCell className="text-right">
                            {row.quantity_received != null ? Number(row.quantity_received) : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.seller_invoice_unit_price != null
                              ? `₹${Number(row.seller_invoice_unit_price).toFixed(2)}`
                              : '—'}
                          </TableCell>
                        </>
                      )}
                      {issueType === 'quality_issue' && (
                        <>
                          <TableCell className="text-right">
                            {row.quantity_received != null ? Number(row.quantity_received) : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.rejection_quantity != null ? Number(row.rejection_quantity) : '—'}
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>
      ))}
    </div>
  )
}
