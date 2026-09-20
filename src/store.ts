import { fetchData, pushData } from './api';

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

// ── Default values (empty, no seeds) ─────────────────────────────────────────

export const DEFAULT_SETTINGS: AppSettings = {
  storeName: 'Williams Larry Moto Parts',
  currency: 'NGN',
  adminPin: '1234',
  supabaseUrl: '',
  supabaseKey: '',
  storageUrl: '',
};

// ── Supabase persistence ───────────────────────────────────────────────────────

const KEYS = ['inv_products', 'inv_sales', 'inv_movements', 'inv_suppliers', 'inv_customers', 'inv_pos', 'inv_settings'] as const;
type DataKey = typeof KEYS[number];

export async function loadAllFromCloud(): Promise<AppData> {
  const [products, sales, movements, suppliers, customers, pos, settings] = await Promise.all(
    KEYS.map(k => fetchData<unknown>(k))
  );
  return {
    products:  (products  as Product[]       ) ?? [],
    sales:     (sales     as Sale[]          ) ?? [],
    movements: (movements as StockMovement[] ) ?? [],
    suppliers: (suppliers as Supplier[]      ) ?? [],
    customers: (customers as Customer[]      ) ?? [],
    pos:       (pos       as PurchaseOrder[] ) ?? [],
    settings:  (settings  as AppSettings     ) ?? DEFAULT_SETTINGS,
  };
}

export async function saveProducts(data: Product[]):       Promise<void> { await pushData('inv_products',  data); }
export async function saveSales(data: Sale[]):             Promise<void> { await pushData('inv_sales',     data); }
export async function saveMovements(data: StockMovement[]): Promise<void> { await pushData('inv_movements', data); }
export async function saveSuppliers(data: Supplier[]):     Promise<void> { await pushData('inv_suppliers', data); }
export async function saveCustomers(data: Customer[]):     Promise<void> { await pushData('inv_customers', data); }
export async function savePOs(data: PurchaseOrder[]):      Promise<void> { await pushData('inv_pos',       data); }
export async function saveSettings(data: AppSettings):    Promise<void> { await pushData('inv_settings',  data); }

// ── Utilities ─────────────────────────────────────────────────────────────────

export function fmt(n: number, currency = 'NGN'): string {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
}
export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
