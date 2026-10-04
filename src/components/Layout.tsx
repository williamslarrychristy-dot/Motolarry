import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Package, ShoppingCart, TrendingUp, Users,
  Truck, ArrowUpDown, Download, Settings, Menu, X, ChevronRight, Bell,
  LogIn, LogOut, User, Receipt, BarChart3, Pin, PinOff, Wifi, WifiOff, RefreshCw
  LogIn, LogOut, User, Receipt, BarChart3, Sparkles
} from 'lucide-react';
import { useData } from '../DataContext';
import { supabase } from '../lib/supabase';
import AuthModal from './AuthModal';
import { User as SupabaseUser } from '@supabase/supabase-js';

export type Page =
  | 'dashboard' | 'products' | 'pos' | 'sales' | 'expenditures' | 'reports' | 'stock'
  | 'ai-assist' | 'customers' | 'suppliers' | 'import-export' | 'settings';

const NAV: { id: Page; label: string; icon: React.ReactNode; group: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} />, group: 'main' },
  { id: 'products', label: 'Products', icon: <Package size={16} />, group: 'main' },
  { id: 'pos', label: 'POS / Checkout', icon: <ShoppingCart size={16} />, group: 'main' },
  { id: 'sales', label: 'Sale History', icon: <TrendingUp size={16} />, group: 'main' },
  { id: 'expenditures', label: 'Expenditures', icon: <Receipt size={16} />, group: 'main' },
  { id: 'reports', label: 'Reports & Analytics', icon: <BarChart3 size={16} />, group: 'main' },
  { id: 'stock', label: 'Stock Control', icon: <ArrowUpDown size={16} />, group: 'main' },
  { id: 'ai-assist', label: 'AI Database Assist', icon: <Sparkles size={16} color="var(--primary)" />, group: 'main' },
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
  const [locked, setLocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem('motolarry_sidebar_locked') === 'true';
    } catch {
      return false;
    }
  });
  const [hovered, setHovered] = useState<boolean>(false);

  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const { products, settings, schemaMissing, isOnline, syncNotice } = useData();
  const lowStock = products.filter(p => p.active && p.qty <= p.reorderPoint).length;

  const sidebarOpen = locked || hovered;

  function toggleLock() {
    setLocked(prev => {
      const next = !prev;
      try {
        localStorage.setItem('motolarry_sidebar_locked', String(next));
      } catch {}
      return next;
    });
  }

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
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: sidebarOpen ? 220 : 60,
          minWidth: sidebarOpen ? 220 : 60,
          background: 'var(--card)', borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          transition: 'width 0.2s ease, min-width 0.2s ease', overflow: 'hidden',
          zIndex: 50,
        }}
      >
        <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <circle cx="12" cy="12" r="3" />
              <line x1="12" y1="3" x2="12" y2="9" />
              <line x1="12" y1="15" x2="12" y2="21" />
              <line x1="3" y1="12" x2="9" y2="12" />
              <line x1="15" y1="12" x2="21" y2="12" />
            </svg>
            {sidebarOpen && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Motolarry</div>
                <div style={{ fontSize: 10, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>Inventory & POS</div>
              </div>
            )}
          </div>

          <button
            onClick={toggleLock}
            title={locked ? "Unlock sidebar (auto-collapse)" : "Lock sidebar open"}
            style={{
              background: 'none', border: 'none', color: locked ? 'var(--primary)' : 'var(--muted-foreground)',
              cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center',
            }}
          >
            {locked ? <Pin size={14} /> : <PinOff size={14} />}
          </button>
        </div>

        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {(['main', 'ops', 'admin'] as const).map(group => {
            const items = NAV.filter(n => n.group === group);
            return (
              <div key={group} style={{ marginBottom: 4 }}>
                {sidebarOpen && (
                  <div style={{ padding: '8px 16px 4px', fontSize: 10, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {group === 'main' ? 'Operations' : group === 'ops' ? 'Management' : 'Admin'}
                  </div>
                )}
                {items.map(item => (
                  <button key={item.id} onClick={() => onNavigate(item.id)} title={!sidebarOpen ? item.label : undefined} style={{
                    display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                    padding: sidebarOpen ? '8px 16px' : '10px 18px', textAlign: 'left',
                    background: current === item.id ? 'rgba(37,99,235,0.1)' : 'transparent',
                    color: current === item.id ? 'var(--primary)' : 'var(--secondary-foreground)',
                    borderLeft: current === item.id ? '3px solid var(--primary)' : '3px solid transparent',
                    fontWeight: current === item.id ? 600 : 400, fontSize: 13, whiteSpace: 'nowrap',
                  }}>
                    {item.icon}
                    {sidebarOpen && <span>{item.label}</span>}
                    {sidebarOpen && item.id === 'products' && lowStock > 0 && (
                      <span style={{ marginLeft: 'auto', background: '#ef4444', color: '#fff', fontSize: 10, borderRadius: 10, padding: '1px 6px', fontFamily: 'var(--font-mono-face)' }}>{lowStock}</span>
                    )}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        {sidebarOpen && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--muted-foreground)' }}>
            <div style={{ fontWeight: 600, color: 'var(--foreground)', fontSize: 12 }}>{settings.storeName || 'Motolarry Parts'}</div>
          </div>
        )}
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{ height: 52, display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', borderBottom: '1px solid var(--border)', background: 'var(--card)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted-foreground)' }}>
            <span style={{ fontWeight: 700, color: 'var(--primary)' }}>Motolarry</span>
            <ChevronRight size={12} />
            <span style={{ color: 'var(--foreground)', fontWeight: 600 }}>{NAV.find(n => n.id === current)?.label}</span>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Connection Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: isOnline ? '#16a34a' : '#ef4444' }}>
              {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
              <span>{isOnline ? 'Cloud Online' : 'Offline Mode'}</span>
            </div>

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
          {/* Sync Notice Banner */}
          {syncNotice && (
            <div style={{
              background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.3)',
              borderRadius: 'var(--radius)', padding: '10px 16px', marginBottom: 16,
              fontSize: 13, color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <RefreshCw size={15} style={{ animation: 'spin 1.5s linear infinite' }} />
              {syncNotice}
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {schemaMissing && !bannerDismissed && (
            <div style={{
              background: 'rgba(234, 179, 8, 0.15)', border: '1px solid rgba(234, 179, 8, 0.4)',
              borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 13, color: '#ca8a04',
            }}>
              <div>
                <strong>⚡ Supabase Schema Setup Required:</strong> Tables not detected in database. Run the exact SQL script in <code>supabase/schema.sql</code> inside your Supabase SQL Editor to initialize your cloud database and enable real-time synchronization across all devices.
              </div>
              <button
                onClick={() => setBannerDismissed(true)}
                style={{ background: 'none', border: 'none', color: '#ca8a04', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                Dismiss ✕
              </button>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
