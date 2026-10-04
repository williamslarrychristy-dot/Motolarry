import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import {
  AppData, Product, Sale, StockMovement, Supplier, Customer, PurchaseOrder, Expense, AppSettings,
  loadAllFromCloud, saveProducts, saveSales, saveMovements, saveSuppliers,
  saveCustomers, savePOs, saveExpenses, saveSettings, DEFAULT_SETTINGS,
  saveSingleMovement, saveSingleExpense,
} from './store';
import { supabase, ensureTablesExist } from './lib/supabase';
import {
  saveLocalCache, loadLocalCache, enqueueOfflineMutation, flushOfflineMutations, getQueuedMutations
} from './lib/offlineStore';
import { RealtimeChannel } from '@supabase/supabase-js';
import { sendStockMovementAlert } from './lib/resend';

interface DataContextValue extends AppData {
  loading: boolean;
  isOnline: boolean;
  syncNotice: string | null;
  schemaMissing: boolean;
  setProducts: (p: Product[]) => void;
  setSales: (s: Sale[]) => void;
  setMovements: (m: StockMovement[]) => void;
  setSuppliers: (s: Supplier[]) => void;
  setCustomers: (c: Customer[]) => void;
  setPOs: (p: PurchaseOrder[]) => void;
  setExpenses: (e: Expense[]) => void;
  addExpense: (e: Expense) => Promise<void>;
  setSettings: (s: AppSettings) => void;
  addStockMovement: (m: StockMovement, productName?: string, sku?: string, newTotalQty?: number) => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [data, setData] = useState<AppData>({
    products: [], sales: [], movements: [], suppliers: [],
    customers: [], pos: [], expenses: [], settings: DEFAULT_SETTINGS,
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setTimedSyncNotice = (msg: string | null) => {
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    setSyncNotice(msg);
    if (msg) {
      syncTimeoutRef.current = setTimeout(() => {
        setSyncNotice(null);
      }, 5000);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);

    if (navigator.onLine) {
      const tablesOk = await ensureTablesExist();
      setSchemaMissing(!tablesOk);
      const fresh = await loadAllFromCloud();

      // If cloud fetch returned records, update local cache
      if (fresh.products.length > 0 || fresh.sales.length > 0) {
        setData(fresh);
        saveLocalCache(fresh);
      } else {
        // Fall back to local cache if cloud is empty/uninitialized
        const cached = loadLocalCache();
        if (cached) setData(cached);
        else setData(fresh);
      }
    } else {
      // Offline fallback
      const cached = loadLocalCache();
      if (cached) setData(cached);
    }

    setLoading(false);
  }, []);

  const syncPending = useCallback(async () => {
    const pending = getQueuedMutations();
    if (pending.length > 0 && navigator.onLine) {
      setTimedSyncNotice('Syncing offline changes...');
      const synced = await flushOfflineMutations();
      if (synced > 0) {
        setTimedSyncNotice('Sync complete. Refreshing page.');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setTimedSyncNotice(null);
      }
    }
  }, []);

  useEffect(() => {
    load();

    const handleOnline = () => {
      setIsOnline(true);
      syncPending();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setTimedSyncNotice('Offline mode active. Changes are saved locally.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Setup Supabase Realtime Broadcast Channel
    const channel = supabase.channel('inventory-realtime');
    channel.on('broadcast', { event: 'state_change' }, (payload) => {
      if (payload.payload) {
        const { entity, value } = payload.payload;
        if (entity && value) {
          setData(prev => {
            const next = { ...prev, [entity]: value };
            saveLocalCache(next);
            return next;
          });
        }
      }
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channelRef.current = channel;
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      supabase.removeChannel(channel);
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [load, syncPending]);

  const broadcastChange = (entity: keyof AppData, value: unknown) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'state_change',
        payload: { entity, value },
      });
    }
  };

  function updateAndPersist(updater: (prev: AppData) => AppData, entity: keyof AppData, saveFn: (val: any) => Promise<void>, val: any) {
    setData(prev => {
      const next = updater(prev);
      saveLocalCache(next);
      return next;
    });

    if (navigator.onLine) {
      saveFn(val).catch(() => {
        enqueueOfflineMutation(entity as any, val);
      });
      broadcastChange(entity, val);
    } else {
      enqueueOfflineMutation(entity as any, val);
    }
  }

  function setProducts(p: Product[]) {
    updateAndPersist(d => ({ ...d, products: p }), 'products', saveProducts, p);
  }

  function setSales(s: Sale[]) {
    updateAndPersist(d => ({ ...d, sales: s }), 'sales', saveSales, s);
  }

  function setMovements(m: StockMovement[]) {
    updateAndPersist(d => ({ ...d, movements: m }), 'movements', saveMovements, m);
  }

  async function addStockMovement(m: StockMovement, productName?: string, sku?: string, newTotalQty?: number) {
    const updated = [m, ...data.movements];
    setData(d => {
      const next = { ...d, movements: updated };
      saveLocalCache(next);
      return next;
    });

    if (navigator.onLine) {
      saveSingleMovement(m).catch(() => {
        enqueueOfflineMutation('movements', updated);
      });
      broadcastChange('movements', updated);
    } else {
      enqueueOfflineMutation('movements', updated);
    }

    const targetProduct = data.products.find(p => p.id === m.productId);
    const name = productName || targetProduct?.name || 'Item';
    const itemSku = sku || targetProduct?.sku || 'SKU';
    const currentQty = newTotalQty ?? targetProduct?.qty ?? 0;

    sendStockMovementAlert({
      productName: name,
      sku: itemSku,
      type: m.type,
      qty: m.qty,
      newQty: currentQty,
      reason: m.reason,
    }).catch(() => {});
  }

  function setSuppliers(s: Supplier[]) {
    updateAndPersist(d => ({ ...d, suppliers: s }), 'suppliers', saveSuppliers, s);
  }

  function setCustomers(c: Customer[]) {
    updateAndPersist(d => ({ ...d, customers: c }), 'customers', saveCustomers, c);
  }

  function setPOs(p: PurchaseOrder[]) {
    updateAndPersist(d => ({ ...d, pos: p }), 'pos', savePOs, p);
  }

  function setExpenses(e: Expense[]) {
    updateAndPersist(d => ({ ...d, expenses: e }), 'expenses', saveExpenses, e);
  }

  async function addExpense(e: Expense) {
    const updated = [e, ...data.expenses];
    setData(d => {
      const next = { ...d, expenses: updated };
      saveLocalCache(next);
      return next;
    });

    if (navigator.onLine) {
      saveSingleExpense(e).catch(() => {
        enqueueOfflineMutation('expenses', updated);
      });
      broadcastChange('expenses', updated);
    } else {
      enqueueOfflineMutation('expenses', updated);
    }
  }

  function setSettings(s: AppSettings) {
    updateAndPersist(d => ({ ...d, settings: s }), 'settings', saveSettings, s);
  }

  return (
    <Ctx.Provider value={{
      ...data,
      loading,
      isOnline,
      syncNotice,
      schemaMissing,
      setProducts,
      setSales,
      setMovements,
      addStockMovement,
      setSuppliers,
      setCustomers,
      setPOs,
      setExpenses,
      addExpense,
      setSettings,
      refresh: load,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useData(): DataContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
