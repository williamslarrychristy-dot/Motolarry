import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  AppData, Product, Sale, StockMovement, Supplier, Customer, PurchaseOrder, AppSettings,
  loadAllFromCloud, saveProducts, saveSales, saveMovements, saveSuppliers,
  saveCustomers, savePOs, saveSettings, DEFAULT_SETTINGS,
} from './store';

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

  const load = useCallback(async () => {
    setLoading(true);
    const fresh = await loadAllFromCloud();
    setData(fresh);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function setProducts(p: Product[]) { setData(d => ({ ...d, products: p })); saveProducts(p).catch(() => {}); }
  function setSales(s: Sale[]) { setData(d => ({ ...d, sales: s })); saveSales(s).catch(() => {}); }
  function setMovements(m: StockMovement[]) { setData(d => ({ ...d, movements: m })); saveMovements(m).catch(() => {}); }
  function setSuppliers(s: Supplier[]) { setData(d => ({ ...d, suppliers: s })); saveSuppliers(s).catch(() => {}); }
  function setCustomers(c: Customer[]) { setData(d => ({ ...d, customers: c })); saveCustomers(c).catch(() => {}); }
  function setPOs(p: PurchaseOrder[]) { setData(d => ({ ...d, pos: p })); savePOs(p).catch(() => {}); }
  function setSettings(s: AppSettings) { setData(d => ({ ...d, settings: s })); saveSettings(s).catch(() => {}); }

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
