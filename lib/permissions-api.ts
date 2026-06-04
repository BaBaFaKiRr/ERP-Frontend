import { erpFetch } from '@/lib/erp-api'

export type PermissionCatalogModule = {
  id: string
  label: string
  resources: Array<{
    id: string
    label: string
    adminOnly: boolean
    actions: string[]
    permissions: Array<{ key: string; action: string; adminOnly: boolean }>
  }>
}

export type PermissionUserRow = {
  userId: string
  employeeId: string
  employeeCode: string
  fullName: string | null
  email: string | null
  department: string | null
  moduleRoles: string[]
}

export type UserPermissionsPayload = {
  userId: string
  moduleRole: string
  permissions: string[]
  defaults: string[]
  overrides: { added: string[]; removed: string[] }
}

export async function fetchPermissionCatalog() {
  return erpFetch<{ modules: PermissionCatalogModule[] }>('/api/permissions/catalog')
}

export async function fetchPermissionUsers() {
  return erpFetch<{ data: PermissionUserRow[] }>('/api/permissions/users')
}

export async function fetchUserPermissions(userId: string) {
  return erpFetch<UserPermissionsPayload>(`/api/permissions/users/${userId}`)
}

export async function saveUserPermissions(userId: string, permissions: string[]) {
  return erpFetch<UserPermissionsPayload>(`/api/permissions/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify({ permissions }),
  })
}

export async function resetUserPermissions(userId: string) {
  return erpFetch<UserPermissionsPayload>(`/api/permissions/users/${userId}/reset-defaults`, {
    method: 'POST',
  })
}
