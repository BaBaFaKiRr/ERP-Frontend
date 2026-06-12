'use client'

import { ItemMasterConfigPage } from '@/components/inventory/item-master-config-page'

export default function UnitsOfMeasureSettingsPage() {
  return (
    <ItemMasterConfigPage
      title="Units of measure"
      description="Manage units used for stock and costing on inventory items."
      listEndpoint="/api/item-masters/units-of-measure"
      createEndpoint="/api/item-masters/units-of-measure"
      nameLabel="Unit name"
      namePlaceholder="e.g. carton"
      emptyMessage="No units yet. Defaults are created automatically on first load."
    />
  )
}
