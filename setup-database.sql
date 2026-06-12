-- Manufacturing ERP Database Schema
-- This file creates all necessary base tables for the Hedgeone ERP system
-- Execute this to initialize the database before migrations

-- Drop and recreate public schema for a clean, idempotent run
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- Grant privileges on public schema
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;

-- Alter default privileges for future objects in public schema
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;

-- Enable extensions in public schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA public;

-- Drop existing types if they exist (for idempotency)
DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.payment_target CASCADE;
DROP TYPE IF EXISTS public.stock_entry_purpose CASCADE;

-- Create enum types
CREATE TYPE public.user_role AS ENUM ('admin', 'accountant', 'store', 'production', 'sales', 'manager', 'supervisor', 'sales_person', 'employee');
CREATE TYPE public.payment_target AS ENUM ('sales_invoice', 'purchase_receipt', 'general_entry', 'purchase_invoice', 'payment_entry');
CREATE TYPE public.stock_entry_purpose AS ENUM ('issue_raw_material', 'receipt_fg', 'dispatch_sales', 'receipt_purchase', 'adjustment', 'debit_note_return', 'credit_note_return');

-- Users table (links to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  role public.user_role DEFAULT 'employee',
  department TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_auth_id ON public.users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Customers table
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  customer_type TEXT,
  ecommerce_platform TEXT,
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
  gst_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Suppliers table
CREATE TABLE IF NOT EXISTS public.suppliers (
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

-- Items table (SKU catalog - replaces products)
CREATE TABLE IF NOT EXISTS public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  item_type TEXT NOT NULL,
  uom TEXT NOT NULL DEFAULT 'pcs',
  reserve_quantity INTEGER DEFAULT 0,
  reorder_level INTEGER DEFAULT 0,
  track_inventory BOOLEAN DEFAULT true,
  standard_cost DECIMAL(15, 2),
  standard_cost_uom TEXT DEFAULT 'pcs',
  hsn TEXT,
  cost_per_unit DECIMAL(15, 2),
  price_per_unit DECIMAL(15, 2),
  mrp DECIMAL(15, 2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT items_sku_key UNIQUE (sku)
);

-- Inventory Balances table (replaces inventory)
CREATE TABLE IF NOT EXISTS public.inventory_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID UNIQUE NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  qty_on_hand NUMERIC(14, 3) NOT NULL DEFAULT 0 CHECK (qty_on_hand >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_balances_item_id ON public.inventory_balances(item_id);

-- Sales Orders table
CREATE TABLE IF NOT EXISTS public.sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL,
  sequence_base TEXT,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft',
  order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivery_date DATE,
  notes TEXT,
  total_amount DECIMAL(15, 2),
  created_by UUID REFERENCES public.users(id),
  approved_by UUID REFERENCES public.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  po_number TEXT,
  po_file_path TEXT,
  po_file_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT sales_orders_order_number_key UNIQUE (order_number)
);

CREATE INDEX IF NOT EXISTS idx_sales_orders_customer_id ON public.sales_orders(customer_id);

-- Sales Order Lines (replaces sales_order_items)
CREATE TABLE IF NOT EXISTS public.sales_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  line_kind TEXT NOT NULL DEFAULT 'stock',
  quantity NUMERIC(14, 3) NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(15, 2),
  line_total DECIMAL(15, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_order_lines_order_id ON public.sales_order_lines(sales_order_id);

-- Work Orders table
CREATE TABLE IF NOT EXISTS public.work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wo_number TEXT NOT NULL,
  sales_order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  sales_order_line_id UUID REFERENCES public.sales_order_lines(id) ON DELETE SET NULL,
  wo_sub_index INTEGER,
  sequence_base TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT work_orders_wo_number_key UNIQUE (wo_number)
);

CREATE INDEX IF NOT EXISTS idx_work_orders_sales_order_id ON public.work_orders(sales_order_id);

-- Work Order Lines (replaces work_order_items)
CREATE TABLE IF NOT EXISTS public.work_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  qty_ordered NUMERIC(14, 3) NOT NULL CHECK (qty_ordered > 0),
  qty_produced NUMERIC(14, 3) NOT NULL DEFAULT 0 CHECK (qty_produced >= 0),
  qty_shipped NUMERIC(14, 3) NOT NULL DEFAULT 0 CHECK (qty_shipped >= 0),
  qty_ready_to_ship NUMERIC(14, 3) NOT NULL DEFAULT 0 CHECK (qty_ready_to_ship >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_order_lines_wo_id ON public.work_order_lines(work_order_id);

-- Purchase Orders table
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number TEXT NOT NULL,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  expected_delivery_date DATE,
  notes TEXT,
  purchase_employee_name TEXT,
  total_amount DECIMAL(15, 2),
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT purchase_orders_po_number_key UNIQUE (po_number)
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON public.purchase_orders(supplier_id);

-- Purchase Order Lines (replaces purchase_order_items)
CREATE TABLE IF NOT EXISTS public.purchase_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  quantity NUMERIC(14, 3) NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(15, 2),
  line_total DECIMAL(15, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_order_lines_po_id ON public.purchase_order_lines(purchase_order_id);

-- General Entries table
CREATE TABLE IF NOT EXISTS public.general_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ge_number TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  employee_payee_id UUID, -- References employees(id) (foreign key left off initially to avoid dependency loop)
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  entry_date DATE DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT general_entries_ge_number_key UNIQUE (ge_number)
);

CREATE INDEX IF NOT EXISTS idx_general_entries_payee_id ON public.general_entries(employee_payee_id);

-- Payments table (replaces payments - will be renamed to payment_entries in migrations)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target public.payment_target NOT NULL,
  sales_invoice_id UUID, -- References sales_invoices(id)
  general_entry_id UUID REFERENCES public.general_entries(id),
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  payment_method TEXT,
  reference_number TEXT,
  notes TEXT,
  recorded_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sales Invoices table (replaces invoices)
CREATE TABLE IF NOT EXISTS public.sales_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL,
  sales_order_id UUID REFERENCES public.sales_orders(id) ON DELETE SET NULL,
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  sequence_base TEXT,
  sub_index INTEGER,
  due_date DATE,
  notes TEXT,
  total_amount DECIMAL(15, 2),
  accountant_name TEXT,
  created_by UUID REFERENCES public.users(id),
  status TEXT NOT NULL DEFAULT 'draft',
  approved_by UUID REFERENCES public.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT sales_invoices_invoice_number_key UNIQUE (invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_sales_invoices_customer_id ON public.sales_invoices(customer_id);

-- Sales Invoice Lines table
CREATE TABLE IF NOT EXISTS public.sales_invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_invoice_id UUID NOT NULL REFERENCES public.sales_invoices(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  quantity NUMERIC(14, 3) NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(15, 2),
  line_total DECIMAL(15, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_invoice_lines_invoice_id ON public.sales_invoice_lines(sales_invoice_id);

-- Material Entries table
CREATE TABLE IF NOT EXISTS public.material_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  me_number TEXT NOT NULL,
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  sequence_base TEXT,
  sub_index INTEGER,
  entry_kind TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  production_employee_name TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.users(id),
  approved_by UUID REFERENCES public.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT material_entries_me_number_key UNIQUE (me_number)
);

-- Material Entry Lines table
CREATE TABLE IF NOT EXISTS public.material_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_entry_id UUID NOT NULL REFERENCES public.material_entries(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  quantity NUMERIC(14, 3) NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_material_entry_lines_me_id ON public.material_entry_lines(material_entry_id);

-- BOM Headers table
CREATE TABLE IF NOT EXISTS public.bom_headers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bom_code TEXT NOT NULL,
  parent_item_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  output_quantity NUMERIC(14, 3) DEFAULT 1,
  output_uom TEXT DEFAULT 'pcs',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT bom_headers_bom_code_unique UNIQUE (bom_code)
);

-- BOM Lines table
CREATE TABLE IF NOT EXISTS public.bom_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bom_id UUID NOT NULL REFERENCES public.bom_headers(id) ON DELETE CASCADE,
  line_no INTEGER,
  component_item_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
  component_name TEXT,
  uom TEXT,
  unit_cost DECIMAL(15, 2),
  quantity_per NUMERIC(14, 3) NOT NULL CHECK (quantity_per > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bom_lines_bom_id ON public.bom_lines(bom_id);

-- Stock Entries table
CREATE TABLE IF NOT EXISTS public.stock_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  se_number TEXT NOT NULL,
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  material_entry_id UUID REFERENCES public.material_entries(id) ON DELETE SET NULL,
  purpose TEXT NOT NULL,
  sequence_base TEXT,
  sub_index INTEGER,
  store_employee_name TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT stock_entries_se_number_key UNIQUE (se_number)
);

-- Stock Entry Lines table
CREATE TABLE IF NOT EXISTS public.stock_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_entry_id UUID NOT NULL REFERENCES public.stock_entries(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  quantity NUMERIC(14, 3) NOT NULL CHECK (quantity > 0),
  direction TEXT NOT NULL CHECK (direction in ('in', 'out')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_entry_lines_se_id ON public.stock_entry_lines(stock_entry_id);

-- Stock Ledger table
CREATE TABLE IF NOT EXISTS public.stock_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  qty_delta NUMERIC(14, 3) NOT NULL,
  ref_type TEXT NOT NULL,
  ref_id UUID NOT NULL,
  stock_entry_id UUID REFERENCES public.stock_entries(id) ON DELETE CASCADE,
  stock_entry_line_id UUID REFERENCES public.stock_entry_lines(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_ledger_item_id ON public.stock_ledger(item_id);

-- Wastage table
CREATE TABLE IF NOT EXISTS public.wastage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE CASCADE,
  material_entry_id UUID REFERENCES public.material_entries(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
  quantity NUMERIC(14, 3) NOT NULL CHECK (quantity > 0),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wastage_wo_id ON public.wastage(work_order_id);

-- Sequence Registry table
CREATE TABLE IF NOT EXISTS public.sequence_registry (
  scope TEXT PRIMARY KEY,
  last_value BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on all base tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.general_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bom_headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bom_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wastage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sequence_registry ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own data" ON public.users
  FOR SELECT USING (auth.uid() = auth_id);

CREATE POLICY "Users can update their own data" ON public.users
  FOR UPDATE USING (auth.uid() = auth_id);

-- General read access policy for other tables (for authenticated users)
CREATE POLICY "Users can read customers" ON public.customers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can read suppliers" ON public.suppliers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can read items" ON public.items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can read inventory_balances" ON public.inventory_balances FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can read sales_orders" ON public.sales_orders FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can read sales_order_lines" ON public.sales_order_lines FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can read work_orders" ON public.work_orders FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can read work_order_lines" ON public.work_order_lines FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can read purchase_orders" ON public.purchase_orders FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can read purchase_order_lines" ON public.purchase_order_lines FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can read general_entries" ON public.general_entries FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can read payments" ON public.payments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can read sales_invoices" ON public.sales_invoices FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can read sales_invoice_lines" ON public.sales_invoice_lines FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can read material_entries" ON public.material_entries FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can read material_entry_lines" ON public.material_entry_lines FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can read bom_headers" ON public.bom_headers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can read bom_lines" ON public.bom_lines FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can read stock_entries" ON public.stock_entries FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can read stock_entry_lines" ON public.stock_entry_lines FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can read stock_ledger" ON public.stock_ledger FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can read wastage" ON public.wastage FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can read sequence_registry" ON public.sequence_registry FOR SELECT USING (auth.role() = 'authenticated');

-- Grant privileges on all currently created objects
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

