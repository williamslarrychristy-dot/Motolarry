import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import {
  AppData, Product, Sale, StockMovement, Supplier, Customer, PurchaseOrder, Expense, Task, AppSettings,
  loadAllFromCloud, saveProducts, saveSales, saveMovements, saveSuppliers,
  saveCustomers, savePOs, saveExpenses, saveTasks, saveSettings, DEFAULT_SETTINGS,
  saveSingleMovement, saveSingleExpense, saveSingleTask
} from './store';
import { supabase, ensureTablesExist } from './lib/supabase';
import {
  saveLocalCache, loadLocalCache, enqueueOfflineMutation, flushOfflineMutations, getQueuedMutations
} from './lib/offlineStore';
import { RealtimeChannel, User as SupabaseUser } from '@supabase/supabase-js';
import { sendStockMovementAlert } from './lib/resend';

interface DataContextValue extends AppData {
  loading: boolean;
  isOnline: boolean;
  syncNotice: string | null;
  schemaMissing: boolean;
  currentUser: SupabaseUser | null;
  setProducts: (p: Product[]) => void;
  setSales: (s: Sale[]) => void;
  setMovements: (m: StockMovement[]) => void;
  setSuppliers: (s: Supplier[]) => void;
  setCustomers: (c: Customer[]) => void;
  setPOs: (p: PurchaseOrder[]) => void;
  setExpenses: (e: Expense[]) => void;
  addExpense: (e: Expense) => Promise<void>;
  setTasks: (t: Task[]) => void;
  addTask: (t: Task) => Promise<void>;
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
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  const [data, setData] = useState<AppData>({
    products: [], sales: [], movements: [], suppliers: [],
    customers: [], pos: [], expenses: [], tasks: [], settings: DEFAULT_SETTINGS,
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

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUser(data.user);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);

    if (navigator.onLine) {
      const tablesOk = await ensureTablesExist();
      setSchemaMissing(!tablesOk);
      const fresh = await loadAllFromCloud();

      // Filter user-scoped records if user is logged in, else display general tenant items
      const filterByUser = <T extends { userId?: string }>(list: T[]): T[] => {
        if (!currentUser) return list;
        return list.filter(item => !item.userId || item.userId === currentUser.id);
      };

      const scopedData: AppData = {
        products: filterByUser(fresh.products),
        sales: filterByUser(fresh.sales),
        movements: filterByUser(fresh.movements),
        suppliers: filterByUser(fresh.suppliers),
        customers: filterByUser(fresh.customers),
        pos: filterByUser(fresh.pos),
        expenses: filterByUser(fresh.expenses),
        tasks: filterByUser(fresh.tasks),
        settings: fresh.settings,
      };

      if (fresh.products.length > 0 || fresh.sales.length > 0) {
        setData(scopedData);
        saveLocalCache(scopedData);
      } else {
        const cached = loadLocalCache();
        if (cached) setData(cached);
        else setData(scopedData);
      }
    } else {
      const cached = loadLocalCache();
      if (cached) setData(cached);
    }

    setLoading(false);
  }, [currentUser]);

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

  function updateAndPersist(updater: (prev: AppData) => AppData, entity: keyof AppData, saveFn: (val: any, uid?: string) => Promise<void>, val: any) {
    const userId = currentUser?.id;
    const taggedVal = Array.isArray(val)
      ? val.map(item => (typeof item === 'object' && item !== null ? { ...item, userId: item.userId || userId } : item))
      : (typeof val === 'object' && val !== null ? { ...val, userId: val.userId || userId } : val);

    setData(prev => {
      const next = updater(prev);
      saveLocalCache(next);
      return next;
    });

    if (navigator.onLine) {
      saveFn(taggedVal, userId).catch(() => {
        enqueueOfflineMutation(entity as any, taggedVal);
      });
      broadcastChange(entity, taggedVal);
    } else {
      enqueueOfflineMutation(entity as any, taggedVal);
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
    const userId = currentUser?.id;
    const movementWithUser = { ...m, userId: m.userId || userId || 'admin' };
    const updated = [movementWithUser, ...data.movements];

    setData(d => {
      const next = { ...d, movements: updated };
      saveLocalCache(next);
      return next;
    });

    if (navigator.onLine) {
      saveSingleMovement(movementWithUser, userId).catch(() => {
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
    const userId = currentUser?.id;
    const expWithUser = { ...e, userId: e.userId || userId };
    const updated = [expWithUser, ...data.expenses];

    setData(d => {
      const next = { ...d, expenses: updated };
      saveLocalCache(next);
      return next;
    });

    if (navigator.onLine) {
      saveSingleExpense(expWithUser, userId).catch(() => {
        enqueueOfflineMutation('expenses', updated);
      });
      broadcastChange('expenses', updated);
    } else {
      enqueueOfflineMutation('expenses', updated);
    }
  }

  function setTasks(t: Task[]) {
    updateAndPersist(d => ({ ...d, tasks: t }), 'tasks', saveTasks, t);
  }

  async function addTask(t: Task) {
    const userId = currentUser?.id;
    const taskWithUser = { ...t, userId: t.userId || userId };
    const updated = [taskWithUser, ...data.tasks];

    setData(d => {
      const next = { ...d, tasks: updated };
      saveLocalCache(next);
      return next;
    });

    if (navigator.onLine) {
      saveSingleTask(taskWithUser, userId).catch(() => {
        enqueueOfflineMutation('tasks', updated);
      });
      broadcastChange('tasks', updated);
    } else {
      enqueueOfflineMutation('tasks', updated);
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
      currentUser,
      setProducts,
      setSales,
      setMovements,
      addStockMovement,
      setSuppliers,
      setCustomers,
      setPOs,
      setExpenses,
      addExpense,
      setTasks,
      addTask,
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
