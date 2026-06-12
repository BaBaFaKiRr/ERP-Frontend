'use client'

import { ItemMasterConfigPage } from '@/components/inventory/item-master-config-page'

export default function CategoriesSettingsPage() {
  return (
    <ItemMasterConfigPage
      title="Item categories"
      description="Create categories before assigning finished goods to them."
      listEndpoint="/api/item-masters/categories"
      createEndpoint="/api/item-masters/categories"
      nameLabel="Category name"
      namePlaceholder="e.g. LED"
      emptyMessage="No categories yet. Add a category before creating finished goods."
    />
  )
}
