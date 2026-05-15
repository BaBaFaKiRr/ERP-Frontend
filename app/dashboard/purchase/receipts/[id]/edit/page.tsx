'use client'

import { useParams } from 'next/navigation'
import { PurchaseReceiptForm } from '../../_components/purchase-receipt-form'

export default function EditPurchaseReceiptPage() {
  const params = useParams<{ id: string }>()
  return <PurchaseReceiptForm mode="edit" receiptId={params.id} />
}
