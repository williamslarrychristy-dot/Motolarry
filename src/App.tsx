import { useState, useEffect } from 'react';
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
import AuthModal from './components/AuthModal';
import { supabase, ensureTablesExist } from './lib/supabase';
import { User } from '@supabase/supabase-js';
import { Shield, Lock } from 'lucide-react';

function AppShell() {
  const [page, setPage] = useState<Page>('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { loading } = useData();

  useEffect(() => {
    ensureTablesExist().catch(() => {});

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setAuthChecked(true);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthChecked(true);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (!authChecked) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16, background: 'var(--background)' }}>
        <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <div style={{ color: 'var(--muted-foreground)', fontSize: 13 }}>Initializing Motolarry Platform…</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
        <div style={{ background: '#ffffff', color: '#0f172a', borderRadius: 16, border: '1px solid #e2e8f0', padding: 40, width: '100%', maxWidth: 440, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(37,99,235,0.1)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, color: 'var(--primary)' }}>
            <Lock size={28} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.02em', color: '#0f172a' }}>Motolarry Inventory</h1>
          <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 28px', lineHeight: 1.6 }}>
            Enterprise Terminal Authentication Required. Please sign in to access products, POS sales, and stock controls.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={() => setAuthModalOpen(true)}
              style={{
                width: '100%', background: '#2563eb', color: '#ffffff',
                border: 'none', borderRadius: 10, padding: '14px 20px',
                fontWeight: 700, fontSize: 15, cursor: 'pointer',
                boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)',
              }}
            >
              Sign In to Access Terminal
            </button>

            <button
              onClick={() => setUser({ id: 'local-operator', email: 'operator@motolarry.local' } as any)}
              style={{
                width: '100%', background: 'transparent', color: '#64748b',
                border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 16px',
                fontWeight: 600, fontSize: 13, cursor: 'pointer',
              }}
            >
              Continue as Offline / Local Operator
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 24, color: '#94a3b8', fontSize: 12 }}>
            <Shield size={14} /> Encrypted Terminal Session
          </div>
        </div>
      </div>
    );
  }

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
          <div style={{ color: 'var(--muted-foreground)', fontSize: 13 }}>Syncing cloud catalog…</div>
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
