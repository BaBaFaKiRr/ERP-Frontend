const DISPATCH_ELIGIBLE_SO_STATUSES = new Set([
  'approved',
  'pending_work_order',
  'work_order_open',
  'in_progress',
  'partially_shipped',
])

const DISPATCH_CREATE_ROLES = new Set(['admin', 'sales', 'store'])

export function isDispatchEligibleSalesOrder(status: string): boolean {
  return DISPATCH_ELIGIBLE_SO_STATUSES.has(status)
}

export function canCreateDispatchOrder(role: string | null | undefined): boolean {
  return !!role && DISPATCH_CREATE_ROLES.has(role)
}

export function dispatchCreateHref(salesOrderId: string): string {
  return `/dashboard/dispatch/${salesOrderId}`
}
