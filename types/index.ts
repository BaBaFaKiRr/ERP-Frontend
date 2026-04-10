export type UserRole = 'admin' | 'manager' | 'supervisor' | 'sales_person' | 'employee'

export interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  role: UserRole
  department?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Customer {
  id: string
  name: string
  email?: string
  phone?: string
  billingAddress?: string
  shippingAddress?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  contactPerson?: string
  creditLimit?: number
  paymentTerms?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Supplier {
  id: string
  name: string
  email?: string
  phone?: string
  billingAddress?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  contactPerson?: string
  paymentTerms?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Product {
  id: string
  code: string
  name: string
  description?: string
  category?: string
  unitPrice?: number
  reorderLevel?: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface InventoryItem {
  id: string
  productId: string
  quantityOnHand: number
  quantityReserved: number
  quantityAvailable: number
  warehouseLocation?: string
  lastStockCheck?: string
  createdAt: string
  updatedAt: string
}

export type OrderStatus = 'draft' | 'pending_approval' | 'approved' | 'partially_delivered' | 'completed' | 'cancelled'

export interface SalesOrder {
  id: string
  orderNumber: string
  customerId: string
  orderDate: string
  deliveryDate?: string
  status: OrderStatus
  totalAmount?: number
  notes?: string
  createdBy?: string
  approvedBy?: string
  approvalDate?: string
  createdAt: string
  updatedAt: string
}

export interface SalesOrderItem {
  id: string
  salesOrderId: string
  productId: string
  quantity: number
  unitPrice?: number
  lineTotal?: number
  createdAt: string
  updatedAt: string
}

export interface PurchaseOrder {
  id: string
  poNumber: string
  supplierId: string
  orderDate: string
  expectedDeliveryDate?: string
  status: OrderStatus
  totalAmount?: number
  notes?: string
  createdBy?: string
  approvedBy?: string
  approvalDate?: string
  createdAt: string
  updatedAt: string
}

export interface PurchaseOrderItem {
  id: string
  purchaseOrderId: string
  productId: string
  quantity: number
  unitPrice?: number
  lineTotal?: number
  receivedQuantity?: number
  createdAt: string
  updatedAt: string
}

export type WorkOrderStatus = 'pending' | 'in_progress' | 'paused' | 'completed' | 'cancelled'

export interface WorkOrder {
  id: string
  woNumber: string
  salesOrderId?: string
  status: WorkOrderStatus
  startDate?: string
  endDate?: string
  assignedTo?: string
  totalQuantity?: number
  completedQuantity?: number
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface WorkOrderItem {
  id: string
  workOrderId: string
  productId: string
  quantity: number
  completedQuantity?: number
  createdAt: string
  updatedAt: string
}

export type MaterialEntryStatus = 'pending' | 'approved' | 'rejected'

export interface MaterialEntry {
  id: string
  entryNumber: string
  workOrderId?: string
  purchaseOrderId?: string
  entryType: 'raw_material_in' | 'raw_material_out' | 'finished_goods_in'
  status: MaterialEntryStatus
  totalAmount?: number
  notes?: string
  requestedBy?: string
  approvedBy?: string
  approvalDate?: string
  createdAt: string
  updatedAt: string
}

export interface MaterialEntryItem {
  id: string
  materialEntryId: string
  productId: string
  quantity: number
  unitPrice?: number
  lineTotal?: number
  createdAt: string
  updatedAt: string
}

export interface StockEntry {
  id: string
  entryNumber: string
  materialEntryId?: string
  workOrderId?: string
  purchaseOrderId?: string
  entryType: 'debit' | 'credit'
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface StockEntryItem {
  id: string
  stockEntryId: string
  productId: string
  quantity: number
  createdAt: string
  updatedAt: string
}

export type InvoiceStatus = 'draft' | 'issued' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled'

export interface Invoice {
  id: string
  invoiceNumber: string
  salesOrderId?: string
  purchaseOrderId?: string
  customerId?: string
  supplierId?: string
  invoiceType: 'sales' | 'purchase'
  invoiceDate: string
  dueDate?: string
  subtotal?: number
  taxAmount?: number
  totalAmount?: number
  status: InvoiceStatus
  notes?: string
  createdBy?: string
  createdAt: string
  updatedAt: string
}

export interface Invoice Item {
  id: string
  invoiceId: string
  productId?: string
  description?: string
  quantity?: number
  unitPrice?: number
  lineTotal?: number
  createdAt: string
  updatedAt: string
}

export type PaymentStatus = 'pending' | 'partial' | 'completed' | 'overdue'

export interface Payment {
  id: string
  invoiceId: string
  paymentDate: string
  amount?: number
  paymentMethod?: string
  referenceNumber?: string
  notes?: string
  status: PaymentStatus
  recordedBy?: string
  createdAt: string
  updatedAt: string
}

export interface Employee {
  id: string
  userId?: string
  employeeNumber: string
  designation?: string
  department?: string
  salary?: number
  hireDate?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface FinanceTransaction {
  id: string
  transactionType: 'income' | 'expense' | 'transfer'
  amount?: number
  description?: string
  category?: string
  referenceId?: string
  transactionDate: string
  recordedBy?: string
  createdAt: string
  updatedAt: string
}
