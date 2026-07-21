export type ReportType =
  | 'sales_orders'
  | 'sales_invoices'
  | 'purchase_orders'
  | 'purchase_receipts'
  | 'payment_entries'
  | 'salary_slips'
  | 'stock_entries'

export type ReportGroupBy =
  | 'summary'
  | 'customer_wise'
  | 'supplier_wise'
  | 'item_wise'
  | 'employee_wise'

export type DatePreset = 'last_week' | 'last_month' | 'last_financial_year' | 'custom'

export type ReportConfig = {
  label: string
  groupByOptions: { value: ReportGroupBy; label: string }[]
  statusOptions?: { value: string; label: string }[]
  entityFilter?: 'customer' | 'supplier' | 'employee' | 'department' | 'purpose'
}

export const DATE_PRESET_OPTIONS: { value: DatePreset; label: string; hint?: string }[] = [
  { value: 'last_week', label: 'Last week', hint: 'Previous Mon–Sun' },
  { value: 'last_month', label: 'Last month', hint: 'Previous calendar month' },
  {
    value: 'last_financial_year',
    label: 'Last financial year',
    hint: 'Apr 1 – Mar 31 (most recently completed)',
  },
  { value: 'custom', label: 'Custom range' },
]

export const STOCK_PURPOSE_OPTIONS = [
  { value: 'all', label: 'All purposes' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'issue_raw_material', label: 'Issue (raw material)' },
  { value: 'receipt_fg', label: 'Receipt (finished goods)' },
  { value: 'receipt_purchase', label: 'Receipt (purchase)' },
  { value: 'dispatch_sales', label: 'Dispatch (sales)' },
  { value: 'wastage_movement', label: 'Wastage movement' },
  { value: 'warehouse_transfer', label: 'Warehouse transfer' },
]

export const REPORT_CONFIGS: Record<ReportType, ReportConfig> = {
  sales_orders: {
    label: 'Sales Orders',
    groupByOptions: [
      { value: 'summary', label: 'Order summary' },
      { value: 'customer_wise', label: 'Customer-wise' },
      { value: 'item_wise', label: 'Item-wise' },
    ],
    statusOptions: [
      { value: 'all', label: 'All statuses' },
      { value: 'draft', label: 'Draft' },
      { value: 'pending_approval', label: 'Pending approval' },
      { value: 'approved', label: 'Approved' },
      { value: 'in_progress', label: 'In progress' },
      { value: 'completed', label: 'Completed' },
      { value: 'cancelled', label: 'Cancelled' },
    ],
    entityFilter: 'customer',
  },
  sales_invoices: {
    label: 'Sales Invoices',
    groupByOptions: [
      { value: 'summary', label: 'Invoice summary' },
      { value: 'customer_wise', label: 'Customer-wise' },
      { value: 'item_wise', label: 'Item-wise' },
    ],
    statusOptions: [
      { value: 'all', label: 'All statuses' },
      { value: 'active', label: 'Active' },
      { value: 'cancelled', label: 'Cancelled' },
    ],
    entityFilter: 'customer',
  },
  purchase_orders: {
    label: 'Purchase Orders',
    groupByOptions: [
      { value: 'summary', label: 'PO summary' },
      { value: 'supplier_wise', label: 'Supplier-wise' },
      { value: 'item_wise', label: 'Item-wise' },
    ],
    statusOptions: [
      { value: 'all', label: 'All statuses' },
      { value: 'draft', label: 'Draft' },
      { value: 'generated', label: 'Generated' },
      { value: 'goods_received', label: 'Goods received' },
      { value: 'closed', label: 'Closed' },
    ],
    entityFilter: 'supplier',
  },
  purchase_receipts: {
    label: 'Purchase Receipts',
    groupByOptions: [
      { value: 'summary', label: 'Receipt summary' },
      { value: 'supplier_wise', label: 'Supplier-wise' },
      { value: 'item_wise', label: 'Item-wise' },
    ],
    statusOptions: [
      { value: 'all', label: 'All statuses' },
      { value: 'pending_approval', label: 'Pending approval' },
      { value: 'approved', label: 'Approved' },
      { value: 'paid', label: 'Paid' },
      { value: 'cancelled', label: 'Cancelled' },
    ],
    entityFilter: 'supplier',
  },
  payment_entries: {
    label: 'Payment Entries',
    groupByOptions: [{ value: 'summary', label: 'Payment summary' }],
  },
  salary_slips: {
    label: 'Salary / Wages',
    groupByOptions: [
      { value: 'summary', label: 'Slip detail' },
      { value: 'employee_wise', label: 'Employee-wise summary' },
    ],
    statusOptions: [
      { value: 'all', label: 'All payment statuses' },
      { value: 'pending', label: 'Pending' },
      { value: 'paid', label: 'Paid' },
      { value: 'cancelled', label: 'Cancelled' },
    ],
    entityFilter: 'employee',
  },
  stock_entries: {
    label: 'Stock Entries',
    groupByOptions: [
      { value: 'summary', label: 'Entry summary' },
      { value: 'item_wise', label: 'Item-wise movement' },
    ],
    entityFilter: 'purpose',
  },
}

export type GenerateReportPayload = {
  reportType: ReportType
  groupBy?: ReportGroupBy
  datePreset: DatePreset
  fromDate?: string
  toDate?: string
  status?: string
  customerId?: string
  supplierId?: string
  employeeId?: string
  department?: string
  purpose?: string
}
