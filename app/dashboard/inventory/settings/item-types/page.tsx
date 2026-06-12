'use client'

import { ItemMasterConfigPage } from '@/components/inventory/item-master-config-page'

export default function ItemTypesSettingsPage() {
  return (
    <ItemMasterConfigPage
      title="Item types"
      description="Manage item types used when creating inventory items."
      listEndpoint="/api/item-masters/item-types"
      createEndpoint="/api/item-masters/item-types"
      nameLabel="Item type name"
      namePlaceholder="e.g. Consumable"
      emptyMessage="No item types yet. Defaults are created automatically on first load."
    />
  )
}
