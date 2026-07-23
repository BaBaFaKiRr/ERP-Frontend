import type { NavItem } from '@/lib/dashboard-nav'

/** Module prefixes used in permission keys → nav section. */
const MODULE_PREFIX_BY_NAV: Record<string, string> = {
  Home: 'home',
  Messages: 'communication',
  Inventory: 'inventory',
  Mfg: 'manufacturing',
  Accounts: 'accounts',
  Purchase: 'purchase',
  Sales: 'sales',
  People: 'hr',
  Dispatch: 'dispatch',
  Settings: 'settings',
  Admin: 'admin',
}

function moduleHasFetchPermission(moduleId: string, permissions: string[]): boolean {
  const prefix = `${moduleId}.`
  return permissions.some((p) => p.startsWith(prefix) && p.endsWith('.fetch'))
}

export function filterNavForPermissions(
  items: NavItem[],
  permissions: string[],
  permissionBypass: boolean,
): NavItem[] {
  if (permissionBypass) return items

  return items.filter((item) => {
    if (item.name === 'Home') {
      return permissions.includes('home.dashboard.fetch')
    }
    const moduleId = MODULE_PREFIX_BY_NAV[item.name]
    if (!moduleId) {
      return item.href?.startsWith('/dashboard/import-export')
        ? permissions.some((p) => p.startsWith('data.'))
        : true
    }
    if (item.name === 'Admin') {
      return permissions.includes('admin.panel.fetch') || permissions.includes('admin.permissions.fetch')
    }
    return moduleHasFetchPermission(moduleId, permissions)
  })
}
