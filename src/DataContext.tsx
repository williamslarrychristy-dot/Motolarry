import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import {
  AppData, Product, Sale, StockMovement, Supplier, Customer, PurchaseOrder, AppSettings,
  loadAllFromCloud, saveProducts, saveSales, saveMovements, saveSuppliers,
  saveCustomers, savePOs, saveSettings, DEFAULT_SETTINGS,
} from './store';
import { supabase } from './lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface DataContextValue extends AppData {
  loading: boolean;
  setProducts: (p: Product[]) => void;
  setSales: (s: Sale[]) => void;
  setMovements: (m: StockMovement[]) => void;
  setSuppliers: (s: Supplier[]) => void;
  setCustomers: (c: Customer[]) => void;
  setPOs: (p: PurchaseOrder[]) => void;
  setSettings: (s: AppSettings) => void;
  refresh: () => Promise<void>;
}

const Ctx = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AppData>({
    products: [], sales: [], movements: [], suppliers: [],
    customers: [], pos: [], settings: DEFAULT_SETTINGS,
  });

  const channelRef = useRef<RealtimeChannel | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const fresh = await loadAllFromCloud();
    setData(fresh);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();

    // Setup Supabase Realtime WebSocket Broadcast Channel
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

  function setSettings(s: AppSettings) {
    setData(d => ({ ...d, settings: s }));
    saveSettings(s).catch(() => {});
    broadcastChange('settings', s);
  }

  return (
    <Ctx.Provider value={{ ...data, loading, setProducts, setSales, setMovements, setSuppliers, setCustomers, setPOs, setSettings, refresh: load }}>
      {children}
    </Ctx.Provider>
  );
}

export function useData(): DataContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
