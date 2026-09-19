export type Category = { id: string; name: string; parent?: string };
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
export type Employee = {
  id: string; name: string; role: 'admin' | 'sales'; pin?: string; active: boolean;
};
export type AppSettings = {
  storeName: string; currency: string; adminPin: string;
  supabaseUrl: string; supabaseKey: string; storageUrl: string;
};

function load<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function save<T>(key: string, val: T) {
  localStorage.setItem(key, JSON.stringify(val));
}

const SEED_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Honda CB400 Chain Kit', description: 'Complete chain and sprocket kit for Honda CB400', sku: 'HCB400-CK', barcode: '1234567890', category: 'Drivetrain', subcategory: 'Chain & Sprocket', brand: 'RK', manufacturer: 'RK Excel', fitment: 'Honda CB400 2001-2020', costPrice: 7500, salePrice: 12500, msrp: 13000, qty: 8, reorderPoint: 3, reorderQty: 10, location: 'Shelf A1', imageUrl: '', aliases: 'comp chain, cb400 chain', active: true, tags: 'fast-moving,honda', serialTracked: false, supplierId: 's1', createdAt: new Date(Date.now() - 90 * 86400000).toISOString() },
  { id: 'p2', name: 'Yamaha Brake Pads Set', description: 'Front and rear brake pads for Yamaha R15 V3', sku: 'YR15-BP', barcode: '1234567891', category: 'Brakes', subcategory: 'Brake Pads', brand: 'Brembo', manufacturer: 'Brembo S.p.A.', fitment: 'Yamaha R15 V3 2017-2023', costPrice: 4200, salePrice: 7200, msrp: 7800, qty: 2, reorderPoint: 5, reorderQty: 15, location: 'Shelf B3', imageUrl: '', aliases: 'yamaha pads, r15 brakes', active: true, tags: 'yamaha,brakes', serialTracked: false, supplierId: 's2', createdAt: new Date(Date.now() - 60 * 86400000).toISOString() },
  { id: 'p3', name: 'Kawasaki Ninja 400 Air Filter', description: 'OEM replacement air filter for Ninja 400', sku: 'KN400-AF', barcode: '1234567892', category: 'Engine', subcategory: 'Air Filter', brand: 'K&N', manufacturer: 'K&N Engineering', fitment: 'Kawasaki Ninja 400 2018-2023', costPrice: 3800, salePrice: 6500, msrp: 7000, qty: 12, reorderPoint: 4, reorderQty: 8, location: 'Shelf C2', imageUrl: '', aliases: 'ninja filter, kawa air', active: true, tags: 'kawasaki,engine', serialTracked: false, supplierId: 's1', createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
  { id: 'p4', name: 'Universal Spark Plug NGK CR8E', description: 'High-performance iridium spark plug', sku: 'NGK-CR8E', barcode: '1234567893', category: 'Engine', subcategory: 'Spark Plug', brand: 'NGK', manufacturer: 'NGK Spark Plugs', fitment: 'Universal 125-400cc', costPrice: 1200, salePrice: 2200, msrp: 2400, qty: 25, reorderPoint: 10, reorderQty: 30, location: 'Shelf D1', imageUrl: '', aliases: 'ngk plug, spark plug', active: true, tags: 'fast-moving,universal', serialTracked: false, supplierId: 's2', createdAt: new Date(Date.now() - 120 * 86400000).toISOString() },
  { id: 'p5', name: 'Honda CG125 Carburetor', description: 'Complete carburetor assembly for Honda CG125', sku: 'HCG125-CARB', barcode: '1234567894', category: 'Engine', subcategory: 'Carburetor', brand: 'Honda', manufacturer: 'Honda Motor Co.', fitment: 'Honda CG125 1990-2010', costPrice: 8500, salePrice: 14000, msrp: 15000, qty: 4, reorderPoint: 2, reorderQty: 5, location: 'Shelf C1', imageUrl: '', aliases: 'cg carb, honda carb 125', active: true, tags: 'honda,engine', serialTracked: true, supplierId: 's1', createdAt: new Date(Date.now() - 45 * 86400000).toISOString() },
];

const SEED_SALES: Sale[] = [
  { id: 'sl1', items: [{ productId: 'p1', name: 'Honda CB400 Chain Kit', sku: 'HCB400-CK', qty: 1, unitPrice: 12500, costPrice: 7500 }], total: 12500, profit: 5000, payment: 'cash', timestamp: new Date(Date.now() - 2 * 3600000).toISOString(), note: '' },
  { id: 'sl2', items: [{ productId: 'p4', name: 'Universal Spark Plug NGK CR8E', sku: 'NGK-CR8E', qty: 2, unitPrice: 2200, costPrice: 1200 }], total: 4400, profit: 2000, payment: 'transfer', timestamp: new Date(Date.now() - 86400000).toISOString(), note: '' },
  { id: 'sl3', items: [{ productId: 'p2', name: 'Yamaha Brake Pads Set', sku: 'YR15-BP', qty: 1, unitPrice: 7200, costPrice: 4200 }, { productId: 'p3', name: 'Kawasaki Ninja 400 Air Filter', sku: 'KN400-AF', qty: 1, unitPrice: 6500, costPrice: 3800 }], total: 13700, profit: 5700, payment: 'card', timestamp: new Date(Date.now() - 2 * 86400000).toISOString(), note: '' },
];

const SEED_SUPPLIERS: Supplier[] = [
  { id: 's1', name: 'Moto Parts Wholesale Ltd', contact: 'Ahmed Bello', phone: '+234 801 234 5678', email: 'ahmed@motoparts.ng', parts: 'Honda, Kawasaki, Yamaha parts' },
  { id: 's2', name: 'AutoBike Distributors', contact: 'Grace Okonkwo', phone: '+234 802 345 6789', email: 'grace@autobike.ng', parts: 'Brakes, Filters, Plugs' },
];

const SEED_CUSTOMERS: Customer[] = [
  { id: 'c1', name: 'Chukwuemeka Obi', phone: '+234 803 456 7890', motorcycle: 'Honda CB400 2015', balance: 0, createdAt: new Date(Date.now() - 200 * 86400000).toISOString() },
  { id: 'c2', name: 'Amina Yusuf', phone: '+234 804 567 8901', motorcycle: 'Yamaha R15 V3 2020', balance: 5000, createdAt: new Date(Date.now() - 100 * 86400000).toISOString() },
];

const SEED_MOVEMENTS: StockMovement[] = [
  { id: 'm1', productId: 'p1', type: 'sale', qty: -1, reason: 'Sale SL1', userId: 'admin', timestamp: new Date(Date.now() - 2 * 3600000).toISOString(), saleId: 'sl1' },
  { id: 'm2', productId: 'p4', type: 'sale', qty: -2, reason: 'Sale SL2', userId: 'admin', timestamp: new Date(Date.now() - 86400000).toISOString(), saleId: 'sl2' },
];

export function getProducts(): Product[] { return load('inv_products', SEED_PRODUCTS); }
export function saveProducts(p: Product[]) { save('inv_products', p); }
export function getSales(): Sale[] { return load('inv_sales', SEED_SALES); }
export function saveSales(s: Sale[]) { save('inv_sales', s); }
export function getMovements(): StockMovement[] { return load('inv_movements', SEED_MOVEMENTS); }
export function saveMovements(m: StockMovement[]) { save('inv_movements', m); }
export function getSuppliers(): Supplier[] { return load('inv_suppliers', SEED_SUPPLIERS); }
export function saveSuppliers(s: Supplier[]) { save('inv_suppliers', s); }
export function getCustomers(): Customer[] { return load('inv_customers', SEED_CUSTOMERS); }
export function saveCustomers(c: Customer[]) { save('inv_customers', c); }
export function getPOs(): PurchaseOrder[] { return load('inv_pos', []); }
export function savePOs(p: PurchaseOrder[]) { save('inv_pos', p); }
export function getSettings(): AppSettings {
  return load('inv_settings', { storeName: "Williams Larry Moto Parts", currency: 'NGN', adminPin: '1234', supabaseUrl: '', supabaseKey: '', storageUrl: '' });
}
export function saveSettings(s: AppSettings) { save('inv_settings', s); }

export function fmt(n: number, currency = 'NGN'): string {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
}
export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
