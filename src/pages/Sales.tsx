import { useState } from 'react';
import { fmt } from '../store';
import { useData } from '../DataContext';
import { Search } from 'lucide-react';

export default function Sales() {
  const { sales, customers } = useData();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = [...sales]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .filter(s => {
      const q = search.toLowerCase();
      return !q || s.id.includes(q) || s.items.some(i => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q));
    });

  const totalRevenue = filtered.reduce((a, s) => a + s.total, 0);
  const totalProfit = filtered.reduce((a, s) => a + s.profit, 0);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Sale History</h1>
        <p style={{ color: 'var(--muted-foreground)', margin: '4px 0 0', fontSize: 13 }}>{sales.length} transactions — immutable records</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20, maxWidth: 500 }}>
        {[['Total Revenue', fmt(totalRevenue)], ['Total Profit', fmt(totalProfit)]].map(([l, v]) => (
          <div key={l} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 18px' }}>
            <div style={{ fontSize: 11, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{l}</div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono-face)', color: 'var(--primary)' }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ position: 'relative', maxWidth: 340, marginBottom: 16 }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by sale ID, product name…" style={{ width: '100%', paddingLeft: 32 }} />
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--secondary)', borderBottom: '1px solid var(--border)' }}>
              {['Sale ID', 'Date', 'Items', 'Customer', 'Payment', 'Total', 'Profit', ''].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => {
              const customer = customers.find(c => c.id === s.customerId);
              return (
                <>
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                    onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--secondary)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono-face)', fontSize: 11, color: 'var(--muted-foreground)' }}>#{s.id}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12 }}>{new Date(s.timestamp).toLocaleString('en-NG')}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12 }}>{s.items.length}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12 }}>{customer ? customer.name : 'Walk-in'}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, textTransform: 'capitalize' }}>{s.payment}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono-face)', fontSize: 12, fontWeight: 600, color: 'var(--primary)' }}>{fmt(s.total)}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono-face)', fontSize: 12 }}>{fmt(s.profit)}</td>
                    <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--muted-foreground)' }}>{expanded === s.id ? '▲' : '▼'}</td>
                  </tr>
                  {expanded === s.id && (
                    <tr key={`${s.id}-exp`} style={{ background: 'var(--secondary)' }}>
                      <td colSpan={8} style={{ padding: '12px 14px' }}>
                        {s.items.map((item, j) => (
                          <div key={j} style={{ display: 'flex', gap: 24, padding: '6px 0', borderBottom: j < s.items.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 12 }}>
                            <span style={{ flex: 2 }}>{item.name}</span>
                            <span style={{ fontFamily: 'var(--font-mono-face)', color: 'var(--muted-foreground)' }}>{item.sku}</span>
                            <span>× {item.qty}</span>
                            <span style={{ fontFamily: 'var(--font-mono-face)' }}>{fmt(item.unitPrice)} each</span>
                            <span style={{ fontFamily: 'var(--font-mono-face)', fontWeight: 600 }}>{fmt(item.unitPrice * item.qty)}</span>
                          </div>
                        ))}
                        {s.note && <div style={{ marginTop: 8, fontSize: 11, color: 'var(--muted-foreground)' }}>Note: {s.note}</div>}
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: 'var(--muted-foreground)' }}>
                {sales.length === 0 ? 'No sales recorded yet' : 'No results match your search'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
