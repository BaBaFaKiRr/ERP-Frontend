-- Manufacturing ERP Database Schema
-- This file creates all necessary tables for the Hedgeone ERP system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing types if they exist (for idempotency)
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS sale_order_status CASCADE;
DROP TYPE IF EXISTS purchase_order_status CASCADE;
DROP TYPE IF EXISTS work_order_status CASCADE;
DROP TYPE IF EXISTS material_entry_status CASCADE;
DROP TYPE IF EXISTS invoice_status CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;

-- Create enum types
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'supervisor', 'sales_person', 'employee');
CREATE TYPE sale_order_status AS ENUM ('draft', 'pending_approval', 'approved', 'partially_delivered', 'completed', 'cancelled');
CREATE TYPE purchase_order_status AS ENUM ('draft', 'pending_approval', 'approved', 'partially_received', 'completed', 'cancelled');
CREATE TYPE work_order_status AS ENUM ('pending', 'in_progress', 'paused', 'completed', 'cancelled');
CREATE TYPE material_entry_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE invoice_status AS ENUM ('draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'partial', 'completed', 'overdue');

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  role user_role DEFAULT 'employee',
  department TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  billing_address TEXT,
  shipping_address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  contact_person TEXT,
  credit_limit DECIMAL(15, 2),
  payment_terms TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  billing_address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  contact_person TEXT,
  payment_terms TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  unit_price DECIMAL(15, 2),
  reorder_level INT DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory table
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  quantity_on_hand INT DEFAULT 0,
  quantity_reserved INT DEFAULT 0,
  quantity_available INT DEFAULT 0,
  warehouse_location TEXT,
  last_stock_check TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory(product_id);

-- Sales Orders table
CREATE TABLE IF NOT EXISTS sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),
  order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivery_date DATE,
  status sale_order_status DEFAULT 'draft',
  total_amount DECIMAL(15, 2),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approval_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_orders_customer_id ON sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(status);

-- Sales Order Items table
CREATE TABLE IF NOT EXISTS sales_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INT NOT NULL,
  unit_price DECIMAL(15, 2),
  line_total DECIMAL(15, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Purchase Orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number TEXT UNIQUE NOT NULL,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expected_delivery_date DATE,
  status purchase_order_status DEFAULT 'draft',
  total_amount DECIMAL(15, 2),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approval_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);

-- Purchase Order Items table
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INT NOT NULL,
  unit_price DECIMAL(15, 2),
  line_total DECIMAL(15, 2),
  received_quantity INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Work Orders table
CREATE TABLE IF NOT EXISTS work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wo_number TEXT UNIQUE NOT NULL,
  sales_order_id UUID REFERENCES sales_orders(id),
  status work_order_status DEFAULT 'pending',
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  assigned_to UUID REFERENCES users(id),
  total_quantity INT,
  completed_quantity INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);

-- Work Order Items table
CREATE TABLE IF NOT EXISTS work_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INT NOT NULL,
  completed_quantity INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Material Entry table
CREATE TABLE IF NOT EXISTS material_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number TEXT UNIQUE NOT NULL,
  work_order_id UUID REFERENCES work_orders(id),
  purchase_order_id UUID REFERENCES purchase_orders(id),
  entry_type TEXT CHECK (entry_type IN ('raw_material_in', 'raw_material_out', 'finished_goods_in')),
  status material_entry_status DEFAULT 'pending',
  total_amount DECIMAL(15, 2),
  notes TEXT,
  requested_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approval_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_material_entries_status ON material_entries(status);

-- Material Entry Items table
CREATE TABLE IF NOT EXISTS material_entry_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_entry_id UUID NOT NULL REFERENCES material_entries(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INT NOT NULL,
  unit_price DECIMAL(15, 2),
  line_total DECIMAL(15, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stock Entries table
CREATE TABLE IF NOT EXISTS stock_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number TEXT UNIQUE NOT NULL,
  material_entry_id UUID REFERENCES material_entries(id),
  work_order_id UUID REFERENCES work_orders(id),
  purchase_order_id UUID REFERENCES purchase_orders(id),
  entry_type TEXT CHECK (entry_type IN ('debit', 'credit')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stock Entry Items table
CREATE TABLE IF NOT EXISTS stock_entry_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_entry_id UUID NOT NULL REFERENCES stock_entries(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  sales_order_id UUID REFERENCES sales_orders(id),
  purchase_order_id UUID REFERENCES purchase_orders(id),
  customer_id UUID REFERENCES customers(id),
  supplier_id UUID REFERENCES suppliers(id),
  invoice_type TEXT CHECK (invoice_type IN ('sales', 'purchase')),
  invoice_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  due_date DATE,
  subtotal DECIMAL(15, 2),
  tax_amount DECIMAL(15, 2),
  total_amount DECIMAL(15, 2),
  status invoice_status DEFAULT 'draft',
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_supplier_id ON invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  amount DECIMAL(15, 2),
  payment_method TEXT,
  reference_number TEXT,
  notes TEXT,
  status payment_status DEFAULT 'pending',
  recorded_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  employee_number TEXT UNIQUE NOT NULL,
  designation TEXT,
  department TEXT,
  salary DECIMAL(15, 2),
  hire_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payroll table (for future use)
CREATE TABLE IF NOT EXISTS payroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id),
  payroll_period TEXT NOT NULL,
  basic_salary DECIMAL(15, 2),
  allowances DECIMAL(15, 2) DEFAULT 0,
  deductions DECIMAL(15, 2) DEFAULT 0,
  net_salary DECIMAL(15, 2),
  status TEXT DEFAULT 'pending',
  paid_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Finance Transactions table
CREATE TABLE IF NOT EXISTS finance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type TEXT CHECK (transaction_type IN ('income', 'expense', 'transfer')),
  amount DECIMAL(15, 2),
  description TEXT,
  category TEXT,
  reference_id UUID,
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  recorded_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_entry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_entry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies - Allow admins to see everything
CREATE POLICY "Admins can access all records" ON users FOR ALL USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Users can see their own record" ON users FOR SELECT USING (auth.uid() = id);

CREATE POLICY "All authenticated users can view customers" ON customers FOR SELECT USING (true);
CREATE POLICY "Managers and sales can create customers" ON customers FOR INSERT WITH CHECK (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'manager', 'sales_person')
);

CREATE POLICY "All authenticated users can view products" ON products FOR SELECT USING (true);

CREATE POLICY "All authenticated users can view inventory" ON inventory FOR SELECT USING (true);

CREATE POLICY "All authenticated users can view sales orders" ON sales_orders FOR SELECT USING (true);
CREATE POLICY "Sales staff can create sales orders" ON sales_orders FOR INSERT WITH CHECK (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'manager', 'sales_person')
);

-- Add more policies as needed for other tables
