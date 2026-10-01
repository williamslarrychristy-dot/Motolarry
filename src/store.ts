import { supabase } from './lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

export type Supplier = {
  id: string; name: string; contact: string; phone: string; email: string; parts: string;
};
export type Product = {
  id: string; name: string; description: string; sku: string; barcode: string;
  category: string; subcategory: string; brand: string; manufacturer: string;
  fitment: string; costPrice: number; salePrice: number; msrp: number;
  qty: number; reorderPoint: number; reorderQty: number; location: string;
  imageUrl: string; aliases: string; active: boolean; tags: string;
  serialTracked: boolean; supplierId: string; createdAt: string;
};
export type StockMovement = {
  id: string; productId: string; type: 'sale' | 'restock' | 'adjustment' | 'return' | 'damage';
  qty: number; reason: string; userId: string; timestamp: string; saleId?: string;
};
export type CartItem = { product: Product; qty: number };
export type SaleItem = { productId: string; name: string; sku: string; qty: number; unitPrice: number; costPrice: number };
export type Sale = {
  id: string; items: SaleItem[]; total: number; profit: number;
  payment: 'cash' | 'transfer' | 'card' | 'credit'; customerId?: string;
  employeeId?: string; timestamp: string; note: string;
};
export type Customer = {
  id: string; name: string; phone: string; motorcycle: string;
  balance: number; createdAt: string;
};
export type PurchaseOrder = {
  id: string; supplierId: string; items: { productId: string; name: string; qty: number; unitCost: number }[];
  status: 'draft' | 'sent' | 'received'; createdAt: string; receivedAt?: string;
};
export type AppSettings = {
  storeName: string; currency: string; adminPin: string;
  supabaseUrl: string; supabaseKey: string; storageUrl: string;
};

export type AppData = {
  products: Product[];
  sales: Sale[];
  movements: StockMovement[];
  suppliers: Supplier[];
  customers: Customer[];
  pos: PurchaseOrder[];
  settings: AppSettings;
};

// ── Default values ─────────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: AppSettings = {
  storeName: 'Williams Larry Moto Parts',
  currency: 'NGN',
  adminPin: '1234',
  supabaseUrl: 'https://oqzifncuhmahxjkrmdbl.supabase.co',
  supabaseKey: 'sb_publishable_gyvM3Tu67aGURaHScXTTGQ_PdHADGpV',
  storageUrl: 'https://oqzifncuhmahxjkrmdbl.supabase.co/storage/v1/object/public/products',
};

// ── Local Storage Helpers ─────────────────────────────────────────────────────

function getLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setLocal<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

// ── Supabase Persistence Engine ───────────────────────────────────────────────

export async function fetchKeyData<T>(key: string): Promise<T | null> {
  try {
    // 1. Try fetching from kv_store table in Supabase
    const { data: kvData, error: kvError } = await supabase
      .from('kv_store')
      .select('data')
      .eq('key', key)
      .single();

    if (!kvError && kvData?.data) {
      setLocal(key, kvData.data);
      return kvData.data as T;
    }
  } catch {}

  // 2. Fallback to localStorage
  return getLocal<T>(key, null as unknown as T);
}

export async function pushKeyData(key: string, data: unknown): Promise<boolean> {
  // Always update local cache first for instant UX
  setLocal(key, data);

  try {
    // Upsert into Supabase kv_store table
    const { error } = await supabase
      .from('kv_store')
      .upsert({ key, data, updated_at: new Date().toISOString() });

    if (error) {
      console.warn(`Supabase kv_store upsert warning for key ${key}:`, error.message);
    }
    return !error;
  } catch (err) {
    console.warn(`Supabase network write warning for key ${key}:`, err);
    return false;
  }
}

// ── App Data Entity Persistence API ──────────────────────────────────────────

const KEYS = ['inv_products', 'inv_sales', 'inv_movements', 'inv_suppliers', 'inv_customers', 'inv_pos', 'inv_settings'] as const;

export async function loadAllFromCloud(): Promise<AppData> {
  const [products, sales, movements, suppliers, customers, pos, settings] = await Promise.all(
    KEYS.map(k => fetchKeyData<unknown>(k))
  );

  return {
    products:  (products  as Product[]       ) ?? getLocal('inv_products', []),
    sales:     (sales     as Sale[]          ) ?? getLocal('inv_sales', []),
    movements: (movements as StockMovement[] ) ?? getLocal('inv_movements', []),
    suppliers: (suppliers as Supplier[]      ) ?? getLocal('inv_suppliers', []),
    customers: (customers as Customer[]      ) ?? getLocal('inv_customers', []),
    pos:       (pos       as PurchaseOrder[] ) ?? getLocal('inv_pos', []),
    settings:  (settings  as AppSettings     ) ?? getLocal('inv_settings', DEFAULT_SETTINGS),
  };
}

export async function saveProducts(data: Product[]):       Promise<void> { await pushKeyData('inv_products',  data); }
export async function saveSales(data: Sale[]):             Promise<void> { await pushKeyData('inv_sales',     data); }
export async function saveMovements(data: StockMovement[]): Promise<void> { await pushKeyData('inv_movements', data); }
export async function saveSuppliers(data: Supplier[]):     Promise<void> { await pushKeyData('inv_suppliers', data); }
export async function saveCustomers(data: Customer[]):     Promise<void> { await pushKeyData('inv_customers', data); }
export async function savePOs(data: PurchaseOrder[]):      Promise<void> { await pushKeyData('inv_pos',       data); }
export async function saveSettings(data: AppSettings):    Promise<void> { await pushKeyData('inv_settings',  data); }

// ── Utilities ─────────────────────────────────────────────────────────────────

export function fmt(n: number, currency = 'NGN'): string {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
