# LEJER ERP App Navigation & User Guide

This guide maps out the user interface routes, buttons, features, and workflows of the LEJER ERP application to help users navigate and perform key business tasks.

---

## 🏢 General Navigation & Org Setup
- **Main Dashboard**: Located at `/dashboard`. Shows a high-level summary of sales, work orders, payables, receivables, and inventory alerts.
- **Organization Switcher & Setup**: Located at `/dashboard/org-setup`. Users can switch between organizations, create a new organization, or configure company details.
- **Settings**: Located at `/dashboard/settings`. Configures system defaults, user profiles, document prefixes (like invoice sequence numbering), and global preferences.

---

## 👥 Human Resources & Employee Management (HR)
- **HR Dashboard**: Located at `/dashboard/hr`. Displays employee count, monthly payroll summaries, and attendance statistics.
- **Employees Catalog**: Located at `/dashboard/hr/employees`. Lists all registered employees.
- **How to Add a New Employee**:
  - Navigate to `/dashboard/hr/employees` and click the **"Add Employee"** button, or go directly to `/dashboard/hr/new`.
  - Enter the employee details (First Name, Last Name, Email, Phone, Employee Code, Role, Base Salary).
- **Attendance**: Located at `/dashboard/hr/attendance`. Logs daily check-ins and check-outs for employees.
- **Payroll & Salary Slips**: Located at `/dashboard/hr/salary-slips`. Used to generate, approve, and email monthly salary slips to employees.

---

## 📦 Inventory & Catalog Management
- **Inventory Dashboard**: Located at `/dashboard/inventory`. Shows stock valuation, reorder alerts, and recent stock movements.
- **Items Catalog (SKUs)**: Located at `/dashboard/inventory/items`. Lists all raw materials and finished goods.
  - **How to Add a New Item**: Navigate to `/dashboard/inventory/items` and click **"New Item"** or go directly to `/dashboard/inventory/items/new`. Enter SKU, Name, Type (Raw Material or Finished Good), UOM, and Standard Cost.
- **Inventory Balances**: Located at `/dashboard/inventory/balances`. Displays real-time quantity on hand for each item.
- **Stock Entries**: Located at `/dashboard/inventory/stock-entries`. Used for manual stock adjustments (stock receipt, stock issue, stock transfer between warehouses).
- **Material Entries**: Located at `/dashboard/inventory/material-entries`. Used to issue raw materials to the shop floor or return leftover materials from production.
- **Bill of Materials (BOM)**: Located at `/dashboard/inventory/bom`. Links finished goods to their raw material components.
  - **How to Create a BOM**: Go to `/dashboard/inventory/bom` and click **"Create BOM"**. Select the parent finished good, set the output quantity, and list the component items and quantities required.

---

## 🛒 Sales & Customer Management
- **Sales Dashboard**: Located at `/dashboard/sales`. Shows monthly sales performance, pending approvals, and top customers.
- **Sales Orders (SO)**: Located at `/dashboard/sales/orders`.
  - **How to Create a Sales Order**: Go to `/dashboard/sales/orders` and click **"Create Sales Order"** (or `/dashboard/sales/orders/new`). Select a customer, add line items, enter quantities, and save as draft or submit for approval.
- **Customers List**: Located at `/dashboard/sales/customers`. Lists all customers with billing/shipping addresses and tax details.
  - **How to Add a Customer**: Go to `/dashboard/sales/customers` and click **"New Customer"** (or `/dashboard/sales/customers/new`).
- **Sales Invoices**: Located at `/dashboard/sales/invoices`. Displays billing invoices generated from fulfilled orders.

---

## 📋 Procurement & Supplier Management (Purchase)
- **Purchase Dashboard**: Located at `/dashboard/purchase`. Shows purchase orders pending delivery, pending bills, and top suppliers.
- **Purchase Orders (PO)**: Located at `/dashboard/purchase/orders`.
  - **How to Create a Purchase Order**: Navigate to `/dashboard/purchase/orders` and click **"Create Purchase Order"** (or `/dashboard/purchase/orders/new`). Select a supplier, add raw materials to purchase, and submit.
- **Suppliers List**: Located at `/dashboard/purchase/suppliers`. Lists all vendor companies.
- **Purchase Receipts**: Located at `/dashboard/purchase/receipts`. Documents goods received from suppliers. Logs received quantity, accepted quantity, and rejected quantity.

---

## 🏭 Manufacturing & Production
- **Manufacturing Dashboard**: Located at `/dashboard/manufacturing`. Displays active work orders, machine/production line status, and daily output logs.
- **Work Orders (WO)**: Located at `/dashboard/manufacturing/work-orders`. Tracks production jobs created from approved Sales Orders. Shows statuses (Pending, In Progress, Completed).
- **Production Planning**: Located at `/dashboard/manufacturing/planning`. Used to schedule production runs based on sales demand and current raw material levels.
- **Production Lines**: Located at `/dashboard/manufacturing/lines`. Manages shop-floor production lines.
- **Shifts & Logs**: Located at `/dashboard/manufacturing/shifts`. Logs worker shifts and production reports.

---

## 💰 Finance & Accounting
- **Finance Dashboard**: Located at `/dashboard/finance`. Shows cash position, P&L, balance sheet, and overdue invoices.
- **Journal Entries**: Located at `/dashboard/finance/journal-entries`. Used for manual ledger bookings, adjustments, and expense recording.
- **Payment Entries**: Located at `/dashboard/finance/payments`. 
  - **How to Record a Payment**: Go to `/dashboard/finance/payments` and click **"Record Payment"** (or `/dashboard/finance/payments/new`). Select target (Sales Invoice, Purchase Invoice, or General Ledger Account), enter amount, select payment method (Bank Transfer, Cash, Cheque, UPI), and reference number.
- **Debit & Credit Notes**: Located at `/dashboard/finance/debit-notes` and `/dashboard/finance/credit-notes`. Used to issue returns or price adjustments.

---

## 🔑 Admin Tools & Permissions
- **Admin Dashboard**: Located at `/dashboard/admin`.
- **User Roles & Permissions**: Located at `/dashboard/admin/permissions`. Allows system administrators to assign module access roles (Owner, Admin, Member) and specific permissions (read, write, delete) to organization users.
