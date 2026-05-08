import { SupplierForm } from '@/app/dashboard/purchase/suppliers/_components/supplier-form'

export default async function EditSupplierPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <SupplierForm mode="edit" supplierId={id} />
}
