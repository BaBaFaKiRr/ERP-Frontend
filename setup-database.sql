-- Manufacturing ERP Database Schema
-- This file creates all necessary tables for the Hedgeone ERP system
-- Execute this in Supabase SQL Editor

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

-- Users table (links to Supabase auth.users)
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
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity_on_hand INT DEFAULT 0,
  quantity_reserved INT DEFAULT 0,
  reorder_level INT DEFAULT 10,
  warehouse_location TEXT,
  last_counted TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory(product_id);

-- Sales Orders table
CREATE TABLE IF NOT EXISTS sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivery_date DATE,
  status sale_order_status DEFAULT 'draft',
  total_amount DECIMAL(15, 2),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_orders_customer_id ON sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(status);

-- Sales Order Line Items
CREATE TABLE IF NOT EXISTS sales_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INT NOT NULL,
  unit_price DECIMAL(15, 2),
  line_total DECIMAL(15, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_order_items_sales_order_id ON sales_order_items(sales_order_id);

-- Purchase Orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number TEXT UNIQUE NOT NULL,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expected_delivery_date DATE,
  status purchase_order_status DEFAULT 'draft',
  total_amount DECIMAL(15, 2),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);

-- Purchase Order Line Items
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INT NOT NULL,
  unit_price DECIMAL(15, 2),
  line_total DECIMAL(15, 2),
  received_qty INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_order_items_purchase_order_id ON purchase_order_items(purchase_order_id);

-- Work Orders table
CREATE TABLE IF NOT EXISTS work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wo_number TEXT UNIQUE NOT NULL,
  sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  status work_order_status DEFAULT 'pending',
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  assigned_to UUID REFERENCES users(id),
  quantity_required INT,
  quantity_completed INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_orders_sales_order_id ON work_orders(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);

-- Material Entry table (for inventory stock entry/debit)
CREATE TABLE IF NOT EXISTS material_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type TEXT NOT NULL, -- 'purchase', 'work_order', 'adjustment'
  reference_id UUID,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INT NOT NULL,
  status material_entry_status DEFAULT 'pending',
  notes TEXT,
  approved_by UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_material_entries_product_id ON material_entries(product_id);

-- Stock Entry table (debit/credit for inventory)
CREATE TABLE IF NOT EXISTS stock_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  reference_type TEXT NOT NULL, -- 'material_entry', 'work_order', 'sale_order'
  reference_id UUID,
  entry_type TEXT NOT NULL, -- 'debit', 'credit'
  quantity INT NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_entries_product_id ON stock_entries(product_id);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  sales_order_id UUID REFERENCES sales_orders(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  invoice_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  due_date DATE,
  status invoice_status DEFAULT 'draft',
  total_amount DECIMAL(15, 2),
  paid_amount DECIMAL(15, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2),
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  payment_method TEXT,
  reference_number TEXT,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  employee_id TEXT UNIQUE NOT NULL,
  department TEXT,
  position TEXT,
  hire_date DATE,
  salary DECIMAL(15, 2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);

-- Finance Transactions table
CREATE TABLE IF NOT EXISTS finance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type TEXT NOT NULL, -- 'invoice', 'payment', 'expense', 'adjustment'
  reference_id UUID,
  amount DECIMAL(15, 2),
  description TEXT,
  category TEXT,
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_transactions_type ON finance_transactions(transaction_type);

-- Enable Row Level Security (RLS)
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
ALTER TABLE material_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table - allow users to see their own data
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (auth.uid() = auth_id);

CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (auth.uid() = auth_id);

-- RLS Policies for other tables - allow all authenticated users to read (can be made more restrictive)
CREATE POLICY "Users can read customers" ON customers
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can read suppliers" ON suppliers
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can read products" ON products
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can read inventory" ON inventory
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can read sales orders" ON sales_orders
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can read sales order items" ON sales_order_items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can read purchase orders" ON purchase_orders
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can read purchase order items" ON purchase_order_items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can read work orders" ON work_orders
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can read material entries" ON material_entries
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can read stock entries" ON stock_entries
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can read invoices" ON invoices
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can read payments" ON payments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can read employees" ON employees
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can read finance transactions" ON finance_transactions
  FOR SELECT USING (auth.role() = 'authenticated');

-- Insert sample data (optional)
-- You can uncomment these to add test data

-- INSERT INTO customers (name, email, phone, contact_person) VALUES
-- ('ABC Manufacturing Ltd', 'contact@abc.com', '1234567890', 'John Doe'),
-- ('XYZ Industries', 'info@xyz.com', '0987654321', 'Jane Smith');

-- INSERT INTO suppliers (name, email, phone, contact_person) VALUES
-- ('Steel Supplies Inc', 'sales@steel.com', '1112223333', 'Mike Johnson'),
-- ('Plastic Components Ltd', 'support@plastic.com', '4445556666', 'Sarah Williams');

-- INSERT INTO products (code, name, category, unit_price, reorder_level) VALUES
-- ('PROD-001', 'Steel Sheet A1', 'Raw Materials', 150.00, 20),
-- ('PROD-002', 'Plastic Pellets', 'Raw Materials', 50.00, 50),
-- ('PROD-003', 'Assembly Part X', 'Components', 75.00, 15);
