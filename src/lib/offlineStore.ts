import { AppData, Product, Sale, StockMovement, Supplier, Customer, PurchaseOrder, Expense, AppSettings } from '../store';
import {
  saveProducts, saveSales, saveMovements, saveSuppliers, saveCustomers, savePOs, saveExpenses, saveSettings
} from '../store';

const OFFLINE_CACHE_KEY = 'motolarry_offline_cache_v1';
const QUEUED_MUTATIONS_KEY = 'motolarry_queued_mutations_v1';

export type PendingMutation = {
  id: string;
  type: 'products' | 'sales' | 'movements' | 'suppliers' | 'customers' | 'pos' | 'expenses' | 'settings';
  payload: any;
  timestamp: string;
};

export function saveLocalCache(data: AppData): void {
  try {
    localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to cache data locally:', e);
  }
}

export function loadLocalCache(): AppData | null {
  try {
    const raw = localStorage.getItem(OFFLINE_CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to load local cache:', e);
  }
  return null;
}

export function enqueueOfflineMutation(type: PendingMutation['type'], payload: any): void {
  try {
    const existing = getQueuedMutations();
    existing.push({
      id: Math.random().toString(36).substring(2, 9),
      type,
      payload,
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem(QUEUED_MUTATIONS_KEY, JSON.stringify(existing));
  } catch (e) {
    console.warn('Failed to queue offline mutation:', e);
  }
}

export function getQueuedMutations(): PendingMutation[] {
  try {
    const raw = localStorage.getItem(QUEUED_MUTATIONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

export function clearQueuedMutations(): void {
  try {
    localStorage.removeItem(QUEUED_MUTATIONS_KEY);
  } catch (e) {}
}

export async function flushOfflineMutations(): Promise<number> {
  const queue = getQueuedMutations();
  if (queue.length === 0) return 0;

  let syncedCount = 0;
  for (const item of queue) {
    try {
      if (item.type === 'products') await saveProducts(item.payload);
      else if (item.type === 'sales') await saveSales(item.payload);
      else if (item.type === 'movements') await saveMovements(item.payload);
      else if (item.type === 'suppliers') await saveSuppliers(item.payload);
      else if (item.type === 'customers') await saveCustomers(item.payload);
      else if (item.type === 'pos') await savePOs(item.payload);
      else if (item.type === 'expenses') await saveExpenses(item.payload);
      else if (item.type === 'settings') await saveSettings(item.payload);
      syncedCount++;
    } catch (e) {
      console.error('Error replaying offline mutation:', e);
    }
  }

  clearQueuedMutations();
  return syncedCount;
}
