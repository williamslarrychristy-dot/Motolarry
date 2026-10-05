-- Supabase Schema for Motolarry Inventory & POS Management
-- Run this script in the SQL Editor at https://supabase.com/dashboard/project/oqzifncuhmahxjkrmdbl/sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Key-Value Store Table (Flexible JSON document backup)
CREATE TABLE IF NOT EXISTS public.kv_store (
    key TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1b. Edge Function Key-Value Store
CREATE TABLE IF NOT EXISTS public.kv_store_82d9e30e (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL
);

-- 2. Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    name TEXT NOT NULL,
    description TEXT,
    sku TEXT DEFAULT '',
    barcode TEXT DEFAULT '',
    category TEXT DEFAULT '',
    subcategory TEXT DEFAULT '',
    brand TEXT DEFAULT '',
    manufacturer TEXT DEFAULT '',
    fitment TEXT DEFAULT '',
    cost_price NUMERIC(12,2) DEFAULT 0,
    sale_price NUMERIC(12,2) DEFAULT 0,
    msrp NUMERIC(12,2) DEFAULT 0,
    qty INT DEFAULT 0,
    reorder_point INT DEFAULT 5,
    reorder_qty INT DEFAULT 10,
    location TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    aliases TEXT DEFAULT '',
    active BOOLEAN DEFAULT TRUE,
    tags TEXT DEFAULT '',
    serial_tracked BOOLEAN DEFAULT FALSE,
    supplier_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Sales Table
CREATE TABLE IF NOT EXISTS public.sales (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    items JSONB NOT NULL,
    total NUMERIC(12,2) NOT NULL,
    profit NUMERIC(12,2) NOT NULL,
    payment TEXT NOT NULL,
    payments JSONB,
    customer_id TEXT,
    employee_id TEXT,
    note TEXT,
    discount NUMERIC(12,2) DEFAULT 0,
    amount_paid NUMERIC(12,2) DEFAULT 0,
    returned_items JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Stock Movements Table
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    product_id TEXT NOT NULL,
    type TEXT NOT NULL,
    qty INT NOT NULL,
    reason TEXT,
    sale_id TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Suppliers Table
CREATE TABLE IF NOT EXISTS public.suppliers (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    name TEXT NOT NULL,
    contact TEXT,
    phone TEXT,
    email TEXT,
    parts TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    name TEXT NOT NULL,
    phone TEXT,
    motorcycle TEXT,
    balance NUMERIC(12,2) DEFAULT 0,
    payments JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Purchase Orders Table
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    supplier_id TEXT NOT NULL,
    items JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    received_at TIMESTAMP WITH TIME ZONE
);

-- 8. Expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    title TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    category TEXT DEFAULT 'General',
    date DATE DEFAULT CURRENT_DATE,
    note TEXT DEFAULT '',
    recorded_by TEXT DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Tasks & Reminders Table
CREATE TABLE IF NOT EXISTS public.tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    due_date DATE,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. App Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    user_id TEXT,
    store_name TEXT DEFAULT 'Motolarry Moto Parts',
    currency TEXT DEFAULT 'NGN',
    admin_pin TEXT DEFAULT '1234',
    supabase_url TEXT,
    supabase_key TEXT,
    storage_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_user ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_timestamp ON public.sales(timestamp);
CREATE INDEX IF NOT EXISTS idx_sales_user ON public.sales(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);
CREATE INDEX IF NOT EXISTS idx_tasks_user ON public.tasks(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.kv_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kv_store_82d9e30e ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if present before recreating
DROP POLICY IF EXISTS "Access kv_store" ON public.kv_store;
DROP POLICY IF EXISTS "Access kv_store_82d9e30e" ON public.kv_store_82d9e30e;
DROP POLICY IF EXISTS "Access products" ON public.products;
DROP POLICY IF EXISTS "Access sales" ON public.sales;
DROP POLICY IF EXISTS "Access stock_movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Access suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Access customers" ON public.customers;
DROP POLICY IF EXISTS "Access purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Access expenses" ON public.expenses;
DROP POLICY IF EXISTS "Access tasks" ON public.tasks;
DROP POLICY IF EXISTS "Access settings" ON public.settings;

-- Allow full read/write for authenticated users & anon terminals
CREATE POLICY "Access kv_store" ON public.kv_store FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Access kv_store_82d9e30e" ON public.kv_store_82d9e30e FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Access products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Access sales" ON public.sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Access stock_movements" ON public.stock_movements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Access suppliers" ON public.suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Access customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Access purchase_orders" ON public.purchase_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Access expenses" ON public.expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Access tasks" ON public.tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Access settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);

-- Storage bucket setup for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public bucket access products" ON storage.objects;
CREATE POLICY "Public bucket access products" ON storage.objects
FOR ALL USING (bucket_id = 'products') WITH CHECK (bucket_id = 'products');
