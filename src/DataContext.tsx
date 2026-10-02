import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import {
  AppData, Product, Sale, StockMovement, Supplier, Customer, PurchaseOrder, Expense, AppSettings,
  loadAllFromCloud, saveProducts, saveSales, saveMovements, saveSuppliers,
  saveCustomers, savePOs, saveExpenses, saveSettings, DEFAULT_SETTINGS,
  saveSingleMovement, saveSingleExpense,
} from './store';
import { supabase, ensureTablesExist } from './lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { sendStockMovementAlert } from './lib/resend';

interface DataContextValue extends AppData {
  loading: boolean;
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
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [data, setData] = useState<AppData>({
    products: [], sales: [], movements: [], suppliers: [],
    customers: [], pos: [], expenses: [], settings: DEFAULT_SETTINGS,
  });

  const channelRef = useRef<RealtimeChannel | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const tablesOk = await ensureTablesExist();
    setSchemaMissing(!tablesOk);
    const fresh = await loadAllFromCloud();
    setData(fresh);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();

    // Setup Supabase Realtime WebSocket Broadcast Channel & Postgres Changes
    const channel = supabase.channel('inventory-realtime');

    channel.on('broadcast', { event: 'state_change' }, (payload) => {
      if (payload.payload) {
        const { entity, value } = payload.payload;
        if (entity && value) {
          setData(prev => ({ ...prev, [entity]: value }));
        }
      }
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channelRef.current = channel;
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const broadcastChange = (entity: keyof AppData, value: unknown) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'state_change',
        payload: { entity, value },
      });
    }
  };

  function setProducts(p: Product[]) {
    setData(d => ({ ...d, products: p }));
    saveProducts(p).catch(() => {});
    broadcastChange('products', p);
  }

  function setSales(s: Sale[]) {
    setData(d => ({ ...d, sales: s }));
    saveSales(s).catch(() => {});
    broadcastChange('sales', s);
  }

  function setMovements(m: StockMovement[]) {
    setData(d => ({ ...d, movements: m }));
    saveMovements(m).catch(() => {});
    broadcastChange('movements', m);
  }

  async function addStockMovement(m: StockMovement, productName?: string, sku?: string, newTotalQty?: number) {
    const updated = [m, ...data.movements];
    setData(d => ({ ...d, movements: updated }));
    saveSingleMovement(m).catch(() => {});
    broadcastChange('movements', updated);

    // Send email alert for stock addition / subtraction
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
    setData(d => ({ ...d, suppliers: s }));
    saveSuppliers(s).catch(() => {});
    broadcastChange('suppliers', s);
  }

  function setCustomers(c: Customer[]) {
    setData(d => ({ ...d, customers: c }));
    saveCustomers(c).catch(() => {});
    broadcastChange('customers', c);
  }

  function setPOs(p: PurchaseOrder[]) {
    setData(d => ({ ...d, pos: p }));
    savePOs(p).catch(() => {});
    broadcastChange('pos', p);
  }

  function setExpenses(e: Expense[]) {
    setData(d => ({ ...d, expenses: e }));
    saveExpenses(e).catch(() => {});
    broadcastChange('expenses', e);
  }

  async function addExpense(e: Expense) {
    const updated = [e, ...data.expenses];
    setData(d => ({ ...d, expenses: updated }));
    saveSingleExpense(e).catch(() => {});
    broadcastChange('expenses', updated);
  }

  function setSettings(s: AppSettings) {
    setData(d => ({ ...d, settings: s }));
    saveSettings(s).catch(() => {});
    broadcastChange('settings', s);
  }

  return (
    <Ctx.Provider value={{
      ...data,
      loading,
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
