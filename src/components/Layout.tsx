import { useState } from 'react';
import {
  LayoutDashboard, Package, ShoppingCart, TrendingUp, Users,
  Truck, ArrowUpDown, Download, Settings, Menu, X, ChevronRight, Bell
} from 'lucide-react';
import { useData } from '../DataContext';

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

export default function Layout({ current, onNavigate, children, syncing }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { products, settings } = useData();
  const lowStock = products.filter(p => p.active && p.qty <= p.reorderPoint).length;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--background)' }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? 220 : 0, minWidth: sidebarOpen ? 220 : 0,
        background: 'var(--card)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.2s, min-width 0.2s', overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>WL Moto Parts</div>
          <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 2, whiteSpace: 'nowrap' }}>Inventory Manager</div>
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
                    background: current === item.id ? 'rgba(249,115,22,0.12)' : 'transparent',
                    color: current === item.id ? 'var(--primary)' : 'var(--secondary-foreground)',
                    borderLeft: current === item.id ? '2px solid var(--primary)' : '2px solid transparent',
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
          <div style={{ fontWeight: 600, color: 'var(--foreground)', fontSize: 12 }}>{settings.storeName}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block', flexShrink: 0 }} />
            Supabase connected
          </div>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{ height: 52, display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', borderBottom: '1px solid var(--border)', background: 'var(--card)', flexShrink: 0 }}>
          <button onClick={() => setSidebarOpen(v => !v)} style={{ background: 'none', color: 'var(--muted-foreground)', padding: 4, display: 'flex' }}>
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted-foreground)' }}>
            <span>WL Moto Parts</span>
            <ChevronRight size={12} />
            <span style={{ color: 'var(--foreground)', fontWeight: 600 }}>{NAV.find(n => n.id === current)?.label}</span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
            {syncing ? (
              <div style={{ fontSize: 11, color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                Loading from Supabase…
              </div>
            ) : (
              <div style={{ fontSize: 11, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                Cloud synced
              </div>
            )}
            {lowStock > 0 && (
              <button onClick={() => onNavigate('stock')} style={{ background: 'none', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500 }}>
                <Bell size={15} />{lowStock} low stock
              </button>
            )}
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--primary-foreground)' }}>WL</div>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
