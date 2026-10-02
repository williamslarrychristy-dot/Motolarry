import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Package, ShoppingCart, TrendingUp, Users,
  Truck, ArrowUpDown, Download, Settings, Menu, X, ChevronRight, Bell,
  LogIn, LogOut, User
} from 'lucide-react';
import { useData } from '../DataContext';
import { supabase } from '../lib/supabase';
import AuthModal from './AuthModal';
import { User as SupabaseUser } from '@supabase/supabase-js';

export type Page =
  | 'dashboard' | 'products' | 'pos' | 'sales' | 'stock'
  | 'customers' | 'suppliers' | 'import-export' | 'settings';

const NAV: { id: Page; label: string; icon: React.ReactNode; group: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} />, group: 'main' },
  { id: 'products', label: 'Products', icon: <Package size={16} />, group: 'main' },
  { id: 'pos', label: 'POS / Checkout', icon: <ShoppingCart size={16} />, group: 'main' },
  { id: 'sales', label: 'Sale History', icon: <TrendingUp size={16} />, group: 'main' },
  { id: 'stock', label: 'Stock Control', icon: <ArrowUpDown size={16} />, group: 'main' },
  { id: 'customers', label: 'Customers', icon: <Users size={16} />, group: 'ops' },
  { id: 'suppliers', label: 'Suppliers', icon: <Truck size={16} />, group: 'ops' },
  { id: 'import-export', label: 'Import / Export', icon: <Download size={16} />, group: 'ops' },
  { id: 'settings', label: 'Settings', icon: <Settings size={16} />, group: 'admin' },
];

interface Props {
  current: Page;
  onNavigate: (p: Page) => void;
  children: React.ReactNode;
  syncing?: boolean;
}

export default function Layout({ current, onNavigate, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { products, settings } = useData();
  const lowStock = products.filter(p => p.active && p.qty <= p.reorderPoint).length;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setUser(null);
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--background)' }}>
      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? 220 : 0, minWidth: sidebarOpen ? 220 : 0,
        background: 'var(--card)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.2s, min-width 0.2s', overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Motolarry</div>
          <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 2, whiteSpace: 'nowrap' }}>Inventory & POS</div>
        </div>

        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {(['main', 'ops', 'admin'] as const).map(group => {
            const items = NAV.filter(n => n.group === group);
            return (
              <div key={group} style={{ marginBottom: 4 }}>
                <div style={{ padding: '8px 16px 4px', fontSize: 10, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {group === 'main' ? 'Operations' : group === 'ops' ? 'Management' : 'Admin'}
                </div>
                {items.map(item => (
                  <button key={item.id} onClick={() => onNavigate(item.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '8px 16px', textAlign: 'left',
                    background: current === item.id ? 'rgba(37,99,235,0.1)' : 'transparent',
                    color: current === item.id ? 'var(--primary)' : 'var(--secondary-foreground)',
                    borderLeft: current === item.id ? '3px solid var(--primary)' : '3px solid transparent',
                    fontWeight: current === item.id ? 600 : 400, fontSize: 13, whiteSpace: 'nowrap',
                  }}>
                    {item.icon}
                    {item.label}
                    {item.id === 'products' && lowStock > 0 && (
                      <span style={{ marginLeft: 'auto', background: '#ef4444', color: '#fff', fontSize: 10, borderRadius: 10, padding: '1px 6px', fontFamily: 'var(--font-mono-face)' }}>{lowStock}</span>
                    )}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--muted-foreground)' }}>
          <div style={{ fontWeight: 600, color: 'var(--foreground)', fontSize: 12 }}>{settings.storeName || 'Motolarry Parts'}</div>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{ height: 52, display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', borderBottom: '1px solid var(--border)', background: 'var(--card)', flexShrink: 0 }}>
          <button onClick={() => setSidebarOpen(v => !v)} style={{ background: 'none', color: 'var(--muted-foreground)', padding: 4, display: 'flex' }}>
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted-foreground)' }}>
            <span>Motolarry</span>
            <ChevronRight size={12} />
            <span style={{ color: 'var(--foreground)', fontWeight: 600 }}>{NAV.find(n => n.id === current)?.label}</span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
            {lowStock > 0 && (
              <button onClick={() => onNavigate('stock')} style={{ background: 'none', border: 'none', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                <Bell size={15} />{lowStock} low stock
              </button>
            )}

            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, background: 'var(--secondary)', padding: '4px 10px', borderRadius: 16 }}>
                  <User size={13} color="var(--primary)" />
                  <span style={{ fontWeight: 600, color: 'var(--foreground)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.email}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  title="Sign Out"
                  style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'var(--primary)', color: 'var(--primary-foreground)',
                  border: 'none', borderRadius: 'var(--radius)', padding: '6px 12px',
                  fontWeight: 600, fontSize: 12, cursor: 'pointer',
                }}
              >
                <LogIn size={14} /> Sign In
              </button>
            )}
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
