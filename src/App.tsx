import { useState } from 'react';
import { DataProvider, useData } from './DataContext';
import Layout, { Page } from './components/Layout';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import POS from './pages/POS';
import Sales from './pages/Sales';
import Stock from './pages/Stock';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import ImportExport from './pages/ImportExport';
import Settings from './pages/Settings';

function AppShell() {
  const [page, setPage] = useState<Page>('dashboard');
  const { loading } = useData();

  const content = {
    dashboard: <Dashboard />,
    products: <Products />,
    pos: <POS />,
    sales: <Sales />,
    stock: <Stock />,
    customers: <Customers />,
    suppliers: <Suppliers />,
    'import-export': <ImportExport />,
    settings: <Settings />,
  }[page];

  return (
    <Layout current={page} onNavigate={setPage} syncing={loading}>
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
          <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          <div style={{ color: 'var(--muted-foreground)', fontSize: 13 }}>Loading from Supabase…</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : content}
    </Layout>
  );
}

export default function App() {
  return (
    <DataProvider>
      <AppShell />
    </DataProvider>
  );
}
