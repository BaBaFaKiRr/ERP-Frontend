import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Package,
  Factory,
  DollarSign,
  ShoppingCart,
  Package2,
  Users,
  Truck,
  Cog,
  Shield,
  HelpCircle,
} from 'lucide-react'

export type NavChild = { name: string; href: string }

export type NavItem = {
  name: string
  href?: string
  icon: LucideIcon
  /** Base path for active-state on child links */
  sectionPrefix?: string
  children?: NavChild[]
  match?: (pathname: string) => boolean
}

export const INVENTORY_CHILDREN: NavChild[] = [
  { name: 'Items', href: '/dashboard/inventory/items' },
  { name: 'BOM', href: '/dashboard/inventory/bom' },
  { name: 'Warehouses', href: '/dashboard/inventory/warehouses' },
  { name: 'Stock', href: '/dashboard/inventory' },
  { name: 'Stock entries', href: '/dashboard/inventory/stock-entries' },
  { name: 'Scrap', href: '/dashboard/inventory/scrap' },
  { name: 'Material Issue Requests', href: '/dashboard/inventory/material-issue-requests' },
  { name: 'Deposit Requests', href: '/dashboard/inventory/deposit-requests' },
]

export const MANUFACTURING_CHILDREN: NavChild[] = [
  { name: 'Production', href: '/dashboard/manufacturing/production' },
  { name: 'Sales Orders', href: '/dashboard/manufacturing' },
  { name: 'Planning', href: '/dashboard/manufacturing/planning' },
  { name: 'Work Orders', href: '/dashboard/manufacturing/work-orders' },
]

export const ACCOUNTS_CHILDREN: NavChild[] = [
  { name: 'Overview', href: '/dashboard/finance' },
  { name: 'GST', href: '/dashboard/finance/gst' },
  { name: 'Invoice Requests', href: '/dashboard/finance/invoice-requests' },
  { name: 'Sales Invoices', href: '/dashboard/finance/sales-invoices' },
  { name: 'Purchase Invoices', href: '/dashboard/finance/purchase-invoices' },
  { name: 'Debit Notes', href: '/dashboard/finance/debit-notes' },
  { name: 'Credit Notes', href: '/dashboard/finance/credit-notes' },
  { name: 'Payment Entries', href: '/dashboard/finance/payment-entries' },
  { name: 'Payment Accounts', href: '/dashboard/finance/payment-accounts' },
  { name: 'Journal Entries', href: '/dashboard/finance/journal-entries' },
  { name: 'Statement of Account', href: '/dashboard/finance/statement-of-account' },
  { name: 'Settings', href: '/dashboard/finance/settings' },
]

export const PURCHASE_CHILDREN: NavChild[] = [
  { name: 'Overview', href: '/dashboard/purchase' },
  { name: 'Purchase Orders', href: '/dashboard/purchase/orders' },
  { name: 'Purchase Receipts', href: '/dashboard/purchase/receipts' },
  { name: 'Suppliers', href: '/dashboard/purchase/suppliers' },
  { name: 'Settings', href: '/dashboard/purchase/settings' },
]

export const SALES_CHILDREN: NavChild[] = [
  { name: 'Overview', href: '/dashboard/sales' },
  { name: 'Sales Orders', href: '/dashboard/sales/orders' },
  { name: 'Customers', href: '/dashboard/sales/customers' },
]

export const HR_CHILDREN: NavChild[] = [
  { name: 'Overview', href: '/dashboard/hr' },
  { name: 'Employees', href: '/dashboard/hr/employees' },
]

export const DISPATCH_CHILDREN: NavChild[] = [
  { name: 'Dispatch Orders', href: '/dashboard/dispatch/orders' },
  { name: 'Sales Orders', href: '/dashboard/dispatch/sales-orders' },
]

function prefixActive(pathname: string, href: string, exact = false) {
  if (exact) return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function childActive(pathname: string, href: string, sectionPrefix: string): boolean {
  if (href === sectionPrefix) return pathname === href
  if (href === '/dashboard/hr/employees') {
    if (pathname.startsWith('/dashboard/hr/employees')) return true
    if (pathname === '/dashboard/hr/new') return true
    if (pathname.startsWith('/dashboard/hr/edit-logs')) return true
    if (pathname.startsWith('/dashboard/hr/import-export')) return true
    const rest = pathname.slice('/dashboard/hr/'.length)
    if (rest && !rest.includes('/') && rest !== 'employees') return true
    return false
  }
  if (href === '/dashboard/inventory') {
    return pathname === '/dashboard/inventory'
  }
  if (href === '/dashboard/dispatch/orders') {
    return pathname === '/dashboard/dispatch' || prefixActive(pathname, href)
  }
  if (href === '/dashboard/dispatch/sales-orders') {
    if (prefixActive(pathname, href)) return true
    const rest = pathname.slice('/dashboard/dispatch/'.length)
    if (rest && !rest.includes('/') && rest !== 'orders') return true
    return false
  }
  return prefixActive(pathname, href)
}

export function sectionActive(pathname: string, prefix: string, children: NavChild[]): boolean {
  if (pathname.startsWith(prefix)) return true
  return children.some((c) => childActive(pathname, c.href, prefix))
}

export const MAIN_NAV: NavItem[] = [
  {
    name: 'Home',
    href: '/dashboard',
    icon: LayoutDashboard,
    match: (p) => p === '/dashboard',
  },
  {
    name: 'Inventory',
    icon: Package,
    sectionPrefix: '/dashboard/inventory',
    children: INVENTORY_CHILDREN,
    match: (p) => sectionActive(p, '/dashboard/inventory', INVENTORY_CHILDREN),
  },
  {
    name: 'Mfg',
    icon: Factory,
    sectionPrefix: '/dashboard/manufacturing',
    children: MANUFACTURING_CHILDREN,
    match: (p) => sectionActive(p, '/dashboard/manufacturing', MANUFACTURING_CHILDREN),
  },
  {
    name: 'Accounts',
    icon: DollarSign,
    sectionPrefix: '/dashboard/finance',
    children: ACCOUNTS_CHILDREN,
    match: (p) => sectionActive(p, '/dashboard/finance', ACCOUNTS_CHILDREN),
  },
  {
    name: 'Purchase',
    icon: ShoppingCart,
    sectionPrefix: '/dashboard/purchase',
    children: PURCHASE_CHILDREN,
    match: (p) => sectionActive(p, '/dashboard/purchase', PURCHASE_CHILDREN),
  },
  {
    name: 'Sales',
    icon: Package2,
    sectionPrefix: '/dashboard/sales',
    children: SALES_CHILDREN,
    match: (p) => sectionActive(p, '/dashboard/sales', SALES_CHILDREN),
  },
  {
    name: 'People',
    icon: Users,
    sectionPrefix: '/dashboard/hr',
    children: HR_CHILDREN,
    match: (p) => sectionActive(p, '/dashboard/hr', HR_CHILDREN),
  },
  {
    name: 'Dispatch',
    icon: Truck,
    sectionPrefix: '/dashboard/dispatch',
    children: DISPATCH_CHILDREN,
    match: (p) => sectionActive(p, '/dashboard/dispatch', DISPATCH_CHILDREN),
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Cog,
    match: (p) => p.startsWith('/dashboard/settings'),
  },
  {
    name: 'Admin',
    href: '/dashboard/admin',
    icon: Shield,
    match: (p) => p.startsWith('/dashboard/admin'),
  },
  {
    name: 'Help',
    href: '/dashboard/help',
    icon: HelpCircle,
    match: (p) => p.startsWith('/dashboard/help'),
  },
]
