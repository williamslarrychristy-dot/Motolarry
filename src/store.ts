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

export type PaymentBreakdown = {
  method: 'cash' | 'transfer' | 'card' | 'credit';
  amount: number;
};

export type Sale = {
  id: string; items: SaleItem[]; total: number; profit: number;
  payment: 'cash' | 'transfer' | 'card' | 'credit';
  payments?: PaymentBreakdown[];
  customerId?: string;
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
  storeName: 'Motolarry Moto Parts',
  currency: 'NGN',
  adminPin: '1234',
  supabaseUrl: '',
  supabaseKey: '',
  storageUrl: '',
};

// ── Local Storage Helpers ─────────────────────────────────────────────────────

function getLocal<T>(key: string): T | null {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

function setLocal<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

// ── Relational Database Mapping ────────────────────────────────────────────────

function mapDbProduct(row: any): Product {
  return {
    id: row.id,
    name: row.name || '',
    description: row.description || '',
    sku: row.sku || '',
    barcode: row.barcode || '',
    category: row.category || '',
    subcategory: row.subcategory || '',
    brand: row.brand || '',
    manufacturer: row.manufacturer || '',
    fitment: row.fitment || '',
    costPrice: Number(row.cost_price ?? row.costPrice ?? 0),
    salePrice: Number(row.sale_price ?? row.salePrice ?? 0),
    msrp: Number(row.msrp ?? 0),
    qty: Number(row.qty ?? 0),
    reorderPoint: Number(row.reorder_point ?? row.reorderPoint ?? 5),
    reorderQty: Number(row.reorder_qty ?? row.reorderQty ?? 10),
    location: row.location || '',
    imageUrl: row.image_url || row.imageUrl || '',
    aliases: row.aliases || '',
    active: row.active ?? true,
    tags: row.tags || '',
    serialTracked: row.serial_tracked ?? row.serialTracked ?? false,
    supplierId: row.supplier_id || row.supplierId || '',
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
  };
}

function mapProductToDb(p: Product) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    sku: p.sku,
    barcode: p.barcode,
    category: p.category,
    subcategory: p.subcategory,
    brand: p.brand,
    manufacturer: p.manufacturer,
    fitment: p.fitment,
    cost_price: p.costPrice,
    sale_price: p.salePrice,
    msrp: p.msrp,
    qty: p.qty,
    reorder_point: p.reorderPoint,
    reorder_qty: p.reorderQty,
    location: p.location,
    image_url: p.imageUrl,
    aliases: p.aliases,
    active: p.active,
    tags: p.tags,
    serial_tracked: p.serialTracked,
    supplier_id: p.supplierId || null,
    created_at: p.createdAt,
  };
}

function mapDbSale(row: any): Sale {
  return {
    id: row.id,
    items: typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || []),
    total: Number(row.total || 0),
    profit: Number(row.profit || 0),
    payment: row.payment || 'cash',
    payments: typeof row.payments === 'string' ? JSON.parse(row.payments) : row.payments,
    customerId: row.customer_id || row.customerId,
    employeeId: row.employee_id || row.employeeId,
    note: row.note || '',
    timestamp: row.timestamp || new Date().toISOString(),
  };
}

function mapSaleToDb(s: Sale) {
  return {
    id: s.id,
    items: s.items,
    total: s.total,
    profit: s.profit,
    payment: s.payment,
    payments: s.payments,
    customer_id: s.customerId || null,
    employee_id: s.employeeId || null,
    note: s.note,
    timestamp: s.timestamp,
  };
}

function mapDbMovement(row: any): StockMovement {
  return {
    id: row.id,
    productId: row.product_id || row.productId,
    type: row.type,
    qty: Number(row.qty || 0),
    reason: row.reason || '',
    userId: row.user_id || row.userId || 'admin',
    timestamp: row.timestamp || new Date().toISOString(),
    saleId: row.sale_id || row.saleId,
  };
}

function mapMovementToDb(m: StockMovement) {
  return {
    id: m.id,
    product_id: m.productId,
    type: m.type,
    qty: m.qty,
    reason: m.reason,
    user_id: m.userId,
    timestamp: m.timestamp,
    sale_id: m.saleId || null,
  };
}

function mapDbCustomer(row: any): Customer {
  return {
    id: row.id,
    name: row.name || '',
    phone: row.phone || '',
    motorcycle: row.motorcycle || '',
    balance: Number(row.balance || 0),
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
  };
}

function mapCustomerToDb(c: Customer) {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    motorcycle: c.motorcycle,
    balance: c.balance,
    created_at: c.createdAt,
  };
}

// ── Direct Supabase Single Entity Mutations ────────────────────────────────────

export async function saveSingleProduct(p: Product): Promise<void> {
  const current = getLocal<Product[]>('motolarry_products') || [];
  const idx = current.findIndex(item => item.id === p.id);
  const updated = idx >= 0 ? current.map(item => item.id === p.id ? p : item) : [p, ...current];
  setLocal('motolarry_products', updated);
  try {
    await supabase.from('products').upsert(mapProductToDb(p), { onConflict: 'id' });
  } catch {}
}

export async function saveSingleSale(s: Sale): Promise<void> {
  const current = getLocal<Sale[]>('motolarry_sales') || [];
  setLocal('motolarry_sales', [s, ...current.filter(x => x.id !== s.id)]);
  try {
    await supabase.from('sales').insert(mapSaleToDb(s));
  } catch {}
}

export async function saveSingleMovement(m: StockMovement): Promise<void> {
  const current = getLocal<StockMovement[]>('motolarry_movements') || [];
  setLocal('motolarry_movements', [m, ...current.filter(x => x.id !== m.id)]);
  try {
    await supabase.from('stock_movements').insert(mapMovementToDb(m));
  } catch {}
}

export async function saveSingleCustomer(c: Customer): Promise<void> {
  const current = getLocal<Customer[]>('motolarry_customers') || [];
  const idx = current.findIndex(item => item.id === c.id);
  const updated = idx >= 0 ? current.map(item => item.id === c.id ? c : item) : [c, ...current];
  setLocal('motolarry_customers', updated);
  try {
    await supabase.from('customers').upsert(mapCustomerToDb(c), { onConflict: 'id' });
  } catch {}
}

export async function saveSingleSupplier(s: Supplier): Promise<void> {
  const current = getLocal<Supplier[]>('motolarry_suppliers') || [];
  const idx = current.findIndex(item => item.id === s.id);
  const updated = idx >= 0 ? current.map(item => item.id === s.id ? s : item) : [s, ...current];
  setLocal('motolarry_suppliers', updated);
  try {
    await supabase.from('suppliers').upsert(s, { onConflict: 'id' });
  } catch {}
}

export async function saveSinglePO(p: PurchaseOrder): Promise<void> {
  const current = getLocal<PurchaseOrder[]>('motolarry_pos') || [];
  const idx = current.findIndex(item => item.id === p.id);
  const updated = idx >= 0 ? current.map(item => item.id === p.id ? p : item) : [p, ...current];
  setLocal('motolarry_pos', updated);
  try {
    await supabase.from('purchase_orders').upsert({
      id: p.id,
      supplier_id: p.supplierId,
      items: p.items,
      status: p.status,
      created_at: p.createdAt,
      received_at: p.receivedAt || null,
    }, { onConflict: 'id' });
  } catch {}
}

// ── Bulk Loaders & Savers ──────────────────────────────────────────────────────

export async function loadProducts(): Promise<Product[]> {
  const local = getLocal<Product[]>('motolarry_products') || [];
  try {
    const { data, error } = await supabase.from('products').select('*');
    if (!error && data) {
      const mapped = data.map(mapDbProduct);
      if (mapped.length > 0 || local.length === 0) {
        setLocal('motolarry_products', mapped);
        return mapped;
      }
    }
  } catch {}
  return local;
}

export async function saveProducts(data: Product[]): Promise<void> {
  setLocal('motolarry_products', data);
  try {
    const rows = data.map(mapProductToDb);
    await supabase.from('products').upsert(rows, { onConflict: 'id' });
  } catch {}
}

export async function loadSales(): Promise<Sale[]> {
  const local = getLocal<Sale[]>('motolarry_sales') || [];
  try {
    const { data, error } = await supabase.from('sales').select('*');
    if (!error && data) {
      const mapped = data.map(mapDbSale);
      if (mapped.length > 0 || local.length === 0) {
        setLocal('motolarry_sales', mapped);
        return mapped;
      }
    }
  } catch {}
  return local;
}

export async function saveSales(data: Sale[]): Promise<void> {
  setLocal('motolarry_sales', data);
  try {
    const rows = data.map(mapSaleToDb);
    await supabase.from('sales').upsert(rows, { onConflict: 'id' });
  } catch {}
}

export async function loadMovements(): Promise<StockMovement[]> {
  const local = getLocal<StockMovement[]>('motolarry_movements') || [];
  try {
    const { data, error } = await supabase.from('stock_movements').select('*');
    if (!error && data) {
      const mapped = data.map(mapDbMovement);
      if (mapped.length > 0 || local.length === 0) {
        setLocal('motolarry_movements', mapped);
        return mapped;
      }
    }
  } catch {}
  return local;
}

export async function saveMovements(data: StockMovement[]): Promise<void> {
  setLocal('motolarry_movements', data);
  try {
    const rows = data.map(mapMovementToDb);
    await supabase.from('stock_movements').upsert(rows, { onConflict: 'id' });
  } catch {}
}

export async function loadSuppliers(): Promise<Supplier[]> {
  const local = getLocal<Supplier[]>('motolarry_suppliers') || [];
  try {
    const { data, error } = await supabase.from('suppliers').select('*');
    if (!error && data) {
      if (data.length > 0 || local.length === 0) {
        setLocal('motolarry_suppliers', data);
        return data as Supplier[];
      }
    }
  } catch {}
  return local;
}

export async function saveSuppliers(data: Supplier[]): Promise<void> {
  setLocal('motolarry_suppliers', data);
  try {
    await supabase.from('suppliers').upsert(data, { onConflict: 'id' });
  } catch {}
}

export async function loadCustomers(): Promise<Customer[]> {
  const local = getLocal<Customer[]>('motolarry_customers') || [];
  try {
    const { data, error } = await supabase.from('customers').select('*');
    if (!error && data) {
      const mapped = data.map(mapDbCustomer);
      if (mapped.length > 0 || local.length === 0) {
        setLocal('motolarry_customers', mapped);
        return mapped;
      }
    }
  } catch {}
  return local;
}

export async function saveCustomers(data: Customer[]): Promise<void> {
  setLocal('motolarry_customers', data);
  try {
    const rows = data.map(mapCustomerToDb);
    await supabase.from('customers').upsert(rows, { onConflict: 'id' });
  } catch {}
}

export async function loadPOs(): Promise<PurchaseOrder[]> {
  const local = getLocal<PurchaseOrder[]>('motolarry_pos') || [];
  try {
    const { data, error } = await supabase.from('purchase_orders').select('*');
    if (!error && data) {
      const mapped = data.map((r: any) => ({
        id: r.id,
        supplierId: r.supplier_id || r.supplierId,
        items: typeof r.items === 'string' ? JSON.parse(r.items) : (r.items || []),
        status: r.status,
        createdAt: r.created_at || r.createdAt,
        receivedAt: r.received_at || r.receivedAt,
      }));
      if (mapped.length > 0 || local.length === 0) {
        setLocal('motolarry_pos', mapped);
        return mapped;
      }
    }
  } catch {}
  return local;
}

export async function savePOs(data: PurchaseOrder[]): Promise<void> {
  setLocal('motolarry_pos', data);
  try {
    const rows = data.map(p => ({
      id: p.id,
      supplier_id: p.supplierId,
      items: p.items,
      status: p.status,
      created_at: p.createdAt,
      received_at: p.receivedAt || null,
    }));
    await supabase.from('purchase_orders').upsert(rows, { onConflict: 'id' });
  } catch {}
}

export async function loadSettings(): Promise<AppSettings> {
  const local = getLocal<AppSettings>('motolarry_settings');
  try {
    const { data, error } = await supabase.from('settings').select('*').eq('id', 'default').single();
    if (!error && data) {
      const mapped = {
        storeName: data.store_name || DEFAULT_SETTINGS.storeName,
        currency: data.currency || DEFAULT_SETTINGS.currency,
        adminPin: data.admin_pin || DEFAULT_SETTINGS.adminPin,
        supabaseUrl: data.supabase_url || '',
        supabaseKey: data.supabase_key || '',
        storageUrl: data.storage_url || '',
      };
      setLocal('motolarry_settings', mapped);
      return mapped;
    }
  } catch {}
  return local || DEFAULT_SETTINGS;
}

export async function saveSettings(data: AppSettings): Promise<void> {
  setLocal('motolarry_settings', data);
  try {
    await supabase.from('settings').upsert({
      id: 'default',
      store_name: data.storeName,
      currency: data.currency,
      admin_pin: data.adminPin,
      supabase_url: data.supabaseUrl,
      supabase_key: data.supabaseKey,
      storage_url: data.storageUrl,
      updated_at: new Date().toISOString(),
    });
  } catch {}
}

export async function loadAllFromCloud(): Promise<AppData> {
  const [products, sales, movements, suppliers, customers, pos, settings] = await Promise.all([
    loadProducts(),
    loadSales(),
    loadMovements(),
    loadSuppliers(),
    loadCustomers(),
    loadPOs(),
    loadSettings(),
  ]);

  return {
    products,
    sales,
    movements,
    suppliers,
    customers,
    pos,
    settings,
  };
}

// ── Utilities ─────────────────────────────────────────────────────────────────

export function fmt(n: number, currency = 'NGN'): string {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
