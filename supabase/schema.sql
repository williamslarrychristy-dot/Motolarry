-- Supabase Schema for Inventory & POS Management
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard/project/oqzifncuhmahxjkrmdbl/sql)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Key-Value Store Table (Flexible document backup)
CREATE TABLE IF NOT EXISTS public.kv_store (
    key TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    sku TEXT UNIQUE NOT NULL,
    barcode TEXT,
    category TEXT,
    subcategory TEXT,
    brand TEXT,
    manufacturer TEXT,
    fitment TEXT,
    cost_price NUMERIC(12,2) DEFAULT 0,
    sale_price NUMERIC(12,2) DEFAULT 0,
    msrp NUMERIC(12,2) DEFAULT 0,
    qty INT DEFAULT 0,
    reorder_point INT DEFAULT 5,
    reorder_qty INT DEFAULT 10,
    location TEXT,
    image_url TEXT,
    aliases TEXT,
    active BOOLEAN DEFAULT TRUE,
    tags TEXT,
    serial_tracked BOOLEAN DEFAULT FALSE,
    supplier_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Sales Table
CREATE TABLE IF NOT EXISTS public.sales (
    id TEXT PRIMARY KEY,
    items JSONB NOT NULL,
    total NUMERIC(12,2) NOT NULL,
    profit NUMERIC(12,2) NOT NULL,
    payment TEXT NOT NULL,
    customer_id TEXT,
    employee_id TEXT,
    note TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Stock Movements Table
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    type TEXT NOT NULL,
    qty INT NOT NULL,
    reason TEXT,
    user_id TEXT,
    sale_id TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Suppliers Table
CREATE TABLE IF NOT EXISTS public.suppliers (
    id TEXT PRIMARY KEY,
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
    name TEXT NOT NULL,
    phone TEXT,
    motorcycle TEXT,
    balance NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Purchase Orders Table
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id TEXT PRIMARY KEY,
    supplier_id TEXT NOT NULL,
    items JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    received_at TIMESTAMP WITH TIME ZONE
);

-- 8. App Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    store_name TEXT DEFAULT 'Williams Larry Moto Parts',
    currency TEXT DEFAULT 'NGN',
    admin_pin TEXT DEFAULT '1234',
    supabase_url TEXT,
    supabase_key TEXT,
    storage_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS) & Policies
ALTER TABLE public.kv_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Allow public / anon read/write for demo/POS terminals
CREATE POLICY "Public full access kv_store" ON public.kv_store FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access sales" ON public.sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access stock_movements" ON public.stock_movements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access suppliers" ON public.suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access purchase_orders" ON public.purchase_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);

-- Storage bucket setup for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public bucket access products" ON storage.objects
FOR ALL USING (bucket_id = 'products') WITH CHECK (bucket_id = 'products');
