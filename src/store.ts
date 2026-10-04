import { supabase } from './lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

export type Supplier = {
  id: string; userId?: string; name: string; contact: string; phone: string; email: string; parts: string;
};

export type Product = {
  id: string; userId?: string; name: string; description: string; sku: string; barcode: string;
  category: string; subcategory: string; brand: string; manufacturer: string;
  fitment: string; costPrice: number; salePrice: number; msrp: number;
  qty: number; reorderPoint: number; reorderQty: number; location: string;
  imageUrl: string; aliases: string; active: boolean; tags: string;
  serialTracked: boolean; supplierId: string; createdAt: string;
};

export type StockMovement = {
  id: string; userId?: string; productId: string; type: 'sale' | 'restock' | 'adjustment' | 'return' | 'damage';
  qty: number; reason: string; timestamp: string; saleId?: string;
};

export type CartItem = { product: Product; qty: number };
export type SaleItem = { productId: string; name: string; sku: string; qty: number; unitPrice: number; costPrice: number };

export type PaymentBreakdown = {
  method: 'cash' | 'transfer' | 'card' | 'credit';
  amount: number;
};

export type ReturnedItem = {
  productId: string;
  qty: number;
  reason: string;
  returnedAt: string;
};

export type Sale = {
  id: string; userId?: string; items: SaleItem[]; total: number; profit: number;
  payment: 'cash' | 'transfer' | 'card' | 'credit';
  payments?: PaymentBreakdown[];
  customerId?: string;
  employeeId?: string; timestamp: string; note: string;
  discount?: number; amountPaid?: number; returnedItems?: ReturnedItem[];
};

export type CustomerPayment = {
  id: string;
  amount: number;
  paymentMethod: 'cash' | 'transfer' | 'card';
  date: string;
  note?: string;
};

export type Customer = {
  id: string; userId?: string; name: string; phone: string; motorcycle: string;
  balance: number; payments?: CustomerPayment[]; createdAt: string;
};

export type PurchaseOrder = {
  id: string; userId?: string; supplierId: string; items: { productId: string; name: string; qty: number; unitCost: number }[];
  status: 'draft' | 'sent' | 'received'; createdAt: string; receivedAt?: string;
};

export type Expense = {
  id: string; userId?: string; title: string; amount: number; category: string;
  date: string; note: string; recordedBy?: string; createdAt: string;
};

export type Task = {
  id: string; userId?: string; title: string; description: string;
  dueDate?: string; status: 'pending' | 'completed'; priority: 'low' | 'medium' | 'high';
  createdAt: string;
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
  expenses: Expense[];
  tasks: Task[];
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

// ── Relational Database Mapping ────────────────────────────────────────────────

function mapDbProduct(row: any): Product {
  return {
    id: row.id,
    userId: row.user_id || row.userId || undefined,
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

function mapProductToDb(p: Product, currentUserId?: string) {
  return {
    id: p.id,
    user_id: p.userId || currentUserId || null,
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
    userId: row.user_id || row.userId || undefined,
    items: typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || []),
    total: Number(row.total || 0),
    profit: Number(row.profit || 0),
    payment: row.payment || 'cash',
    payments: typeof row.payments === 'string' ? JSON.parse(row.payments) : row.payments,
    customerId: row.customer_id || row.customerId,
    employeeId: row.employee_id || row.employeeId,
    note: row.note || '',
    discount: Number(row.discount || 0),
    amountPaid: Number(row.amount_paid ?? row.amountPaid ?? row.total),
    returnedItems: typeof row.returned_items === 'string' ? JSON.parse(row.returned_items) : row.returned_items,
    timestamp: row.timestamp || new Date().toISOString(),
  };
}

function mapSaleToDb(s: Sale, currentUserId?: string) {
  return {
    id: s.id,
    user_id: s.userId || currentUserId || null,
    items: s.items,
    total: s.total,
    profit: s.profit,
    payment: s.payment,
    payments: s.payments,
    customer_id: s.customerId || null,
    employee_id: s.employeeId || null,
    note: s.note,
    discount: s.discount || 0,
    amount_paid: s.amountPaid ?? s.total,
    returned_items: s.returnedItems || null,
    timestamp: s.timestamp,
  };
}

function mapDbMovement(row: any): StockMovement {
  return {
    id: row.id,
    userId: row.user_id || row.userId || 'admin',
    productId: row.product_id || row.productId,
    type: row.type,
    qty: Number(row.qty || 0),
    reason: row.reason || '',
    timestamp: row.timestamp || new Date().toISOString(),
    saleId: row.sale_id || row.saleId,
  };
}

function mapMovementToDb(m: StockMovement, currentUserId?: string) {
  return {
    id: m.id,
    user_id: m.userId || currentUserId || null,
    product_id: m.productId,
    type: m.type,
    qty: m.qty,
    reason: m.reason,
    timestamp: m.timestamp,
    sale_id: m.saleId || null,
  };
}

function mapDbCustomer(row: any): Customer {
  return {
    id: row.id,
    userId: row.user_id || row.userId || undefined,
    name: row.name || '',
    phone: row.phone || '',
    motorcycle: row.motorcycle || '',
    balance: Number(row.balance || 0),
    payments: typeof row.payments === 'string' ? JSON.parse(row.payments) : row.payments,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
  };
}

function mapCustomerToDb(c: Customer, currentUserId?: string) {
  return {
    id: c.id,
    user_id: c.userId || currentUserId || null,
    name: c.name,
    phone: c.phone,
    motorcycle: c.motorcycle,
    balance: c.balance,
    payments: c.payments || null,
    created_at: c.createdAt,
  };
}

function mapDbExpense(row: any): Expense {
  return {
    id: row.id,
    userId: row.user_id || row.userId || undefined,
    title: row.title || '',
    amount: Number(row.amount || 0),
    category: row.category || 'General',
    date: row.date || new Date().toISOString().slice(0, 10),
    note: row.note || '',
    recordedBy: row.recorded_by || row.recordedBy || 'admin',
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
  };
}

function mapExpenseToDb(e: Expense, currentUserId?: string) {
  return {
    id: e.id,
    user_id: e.userId || currentUserId || null,
    title: e.title,
    amount: e.amount,
    category: e.category,
    date: e.date,
    note: e.note,
    recorded_by: e.recordedBy || null,
    created_at: e.createdAt,
  };
}

function mapDbTask(row: any): Task {
  return {
    id: row.id,
    userId: row.user_id || row.userId || undefined,
    title: row.title || '',
    description: row.description || '',
    dueDate: row.due_date || row.dueDate,
    status: row.status || 'pending',
    priority: row.priority || 'medium',
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
  };
}

function mapTaskToDb(t: Task, currentUserId?: string) {
  return {
    id: t.id,
    user_id: t.userId || currentUserId || null,
    title: t.title,
    description: t.description,
    due_date: t.dueDate || null,
    status: t.status,
    priority: t.priority,
    created_at: t.createdAt,
  };
}

// ── Direct Supabase Single Entity Mutations ────────────────────────────────────

export async function saveSingleProduct(p: Product, currentUserId?: string): Promise<void> {
  const { error } = await supabase.from('products').upsert(mapProductToDb(p, currentUserId), { onConflict: 'id' });
  if (error) console.error('Error saving product to Supabase:', error);
}

export async function saveSingleSale(s: Sale, currentUserId?: string): Promise<void> {
  const { error } = await supabase.from('sales').insert(mapSaleToDb(s, currentUserId));
  if (error) console.error('Error saving sale to Supabase:', error);
}

export async function saveSingleMovement(m: StockMovement, currentUserId?: string): Promise<void> {
  const { error } = await supabase.from('stock_movements').insert(mapMovementToDb(m, currentUserId));
  if (error) console.error('Error saving stock movement to Supabase:', error);
}

export async function saveSingleCustomer(c: Customer, currentUserId?: string): Promise<void> {
  const { error } = await supabase.from('customers').upsert(mapCustomerToDb(c, currentUserId), { onConflict: 'id' });
  if (error) console.error('Error saving customer to Supabase:', error);
}

export async function saveSingleSupplier(s: Supplier, currentUserId?: string): Promise<void> {
  const { error } = await supabase.from('suppliers').upsert({ ...s, user_id: s.userId || currentUserId || null }, { onConflict: 'id' });
  if (error) console.error('Error saving supplier to Supabase:', error);
}

export async function saveSinglePO(p: PurchaseOrder, currentUserId?: string): Promise<void> {
  const { error } = await supabase.from('purchase_orders').upsert({
    id: p.id,
    user_id: p.userId || currentUserId || null,
    supplier_id: p.supplierId,
    items: p.items,
    status: p.status,
    created_at: p.createdAt,
    received_at: p.receivedAt || null,
  }, { onConflict: 'id' });
  if (error) console.error('Error saving purchase order to Supabase:', error);
}

export async function saveSingleExpense(e: Expense, currentUserId?: string): Promise<void> {
  const { error } = await supabase.from('expenses').upsert(mapExpenseToDb(e, currentUserId), { onConflict: 'id' });
  if (error) console.error('Error saving expense to Supabase:', error);
}

export async function saveSingleTask(t: Task, currentUserId?: string): Promise<void> {
  const { error } = await supabase.from('tasks').upsert(mapTaskToDb(t, currentUserId), { onConflict: 'id' });
  if (error) console.error('Error saving task to Supabase:', error);
}

// ── Bulk Loaders & Savers ──────────────────────────────────────────────────────

export async function loadProducts(): Promise<Product[]> {
  try {
    const { data, error } = await supabase.from('products').select('*');
    if (!error && data) {
      return data.map(mapDbProduct);
    }
  } catch {}
  return [];
}

export async function saveProducts(data: Product[], currentUserId?: string): Promise<void> {
  try {
    const rows = data.map(p => mapProductToDb(p, currentUserId));
    await supabase.from('products').upsert(rows, { onConflict: 'id' });
  } catch {}
}

export async function loadSales(): Promise<Sale[]> {
  try {
    const { data, error } = await supabase.from('sales').select('*');
    if (!error && data) {
      return data.map(mapDbSale);
    }
  } catch {}
  return [];
}

export async function saveSales(data: Sale[], currentUserId?: string): Promise<void> {
  try {
    const rows = data.map(s => mapSaleToDb(s, currentUserId));
    await supabase.from('sales').upsert(rows, { onConflict: 'id' });
  } catch {}
}

export async function loadMovements(): Promise<StockMovement[]> {
  try {
    const { data, error } = await supabase.from('stock_movements').select('*');
    if (!error && data) {
      return data.map(mapDbMovement);
    }
  } catch {}
  return [];
}

export async function saveMovements(data: StockMovement[], currentUserId?: string): Promise<void> {
  try {
    const rows = data.map(m => mapMovementToDb(m, currentUserId));
    await supabase.from('stock_movements').upsert(rows, { onConflict: 'id' });
  } catch {}
}

export async function loadSuppliers(): Promise<Supplier[]> {
  try {
    const { data, error } = await supabase.from('suppliers').select('*');
    if (!error && data) {
      return data.map((s: any) => ({
        id: s.id,
        userId: s.user_id || s.userId || undefined,
        name: s.name || '',
        contact: s.contact || '',
        phone: s.phone || '',
        email: s.email || '',
        parts: s.parts || '',
      }));
    }
  } catch {}
  return [];
}

export async function saveSuppliers(data: Supplier[], currentUserId?: string): Promise<void> {
  try {
    const rows = data.map(s => ({ ...s, user_id: s.userId || currentUserId || null }));
    await supabase.from('suppliers').upsert(rows, { onConflict: 'id' });
  } catch {}
}

export async function loadCustomers(): Promise<Customer[]> {
  try {
    const { data, error } = await supabase.from('customers').select('*');
    if (!error && data) {
      return data.map(mapDbCustomer);
    }
  } catch {}
  return [];
}

export async function saveCustomers(data: Customer[], currentUserId?: string): Promise<void> {
  try {
    const rows = data.map(c => mapCustomerToDb(c, currentUserId));
    await supabase.from('customers').upsert(rows, { onConflict: 'id' });
  } catch {}
}

export async function loadPOs(): Promise<PurchaseOrder[]> {
  try {
    const { data, error } = await supabase.from('purchase_orders').select('*');
    if (!error && data) {
      return data.map((r: any) => ({
        id: r.id,
        userId: r.user_id || r.userId || undefined,
        supplierId: r.supplier_id || r.supplierId,
        items: typeof r.items === 'string' ? JSON.parse(r.items) : (r.items || []),
        status: r.status,
        createdAt: r.created_at || r.createdAt,
        receivedAt: r.received_at || r.receivedAt,
      }));
    }
  } catch {}
  return [];
}

export async function savePOs(data: PurchaseOrder[], currentUserId?: string): Promise<void> {
  try {
    const rows = data.map(p => ({
      id: p.id,
      user_id: p.userId || currentUserId || null,
      supplier_id: p.supplierId,
      items: p.items,
      status: p.status,
      created_at: p.createdAt,
      received_at: p.receivedAt || null,
    }));
    await supabase.from('purchase_orders').upsert(rows, { onConflict: 'id' });
  } catch {}
}

export async function loadExpenses(): Promise<Expense[]> {
  try {
    const { data, error } = await supabase.from('expenses').select('*');
    if (!error && data) {
      return data.map(mapDbExpense);
    }
  } catch {}
  return [];
}

export async function saveExpenses(data: Expense[], currentUserId?: string): Promise<void> {
  try {
    const rows = data.map(e => mapExpenseToDb(e, currentUserId));
    await supabase.from('expenses').upsert(rows, { onConflict: 'id' });
  } catch {}
}

export async function loadTasks(): Promise<Task[]> {
  try {
    const { data, error } = await supabase.from('tasks').select('*');
    if (!error && data) {
      return data.map(mapDbTask);
    }
  } catch {}
  return [];
}

export async function saveTasks(data: Task[], currentUserId?: string): Promise<void> {
  try {
    const rows = data.map(t => mapTaskToDb(t, currentUserId));
    await supabase.from('tasks').upsert(rows, { onConflict: 'id' });
  } catch {}
}

export async function loadSettings(): Promise<AppSettings> {
  try {
    const { data, error } = await supabase.from('settings').select('*').eq('id', 'default').single();
    if (!error && data) {
      return {
        storeName: data.store_name || DEFAULT_SETTINGS.storeName,
        currency: data.currency || DEFAULT_SETTINGS.currency,
        adminPin: data.admin_pin || DEFAULT_SETTINGS.adminPin,
        supabaseUrl: data.supabase_url || '',
        supabaseKey: data.supabase_key || '',
        storageUrl: data.storage_url || '',
      };
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

export async function saveSettings(data: AppSettings): Promise<void> {
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
  const [products, sales, movements, suppliers, customers, pos, expenses, tasks, settings] = await Promise.all([
    loadProducts(),
    loadSales(),
    loadMovements(),
    loadSuppliers(),
    loadCustomers(),
    loadPOs(),
    loadExpenses(),
    loadTasks(),
    loadSettings(),
  ]);

  return {
    products,
    sales,
    movements,
    suppliers,
    customers,
    pos,
    expenses,
    tasks,
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
