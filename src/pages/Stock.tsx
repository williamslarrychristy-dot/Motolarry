import { useState } from 'react';
import { getProducts, saveProducts, getMovements, saveMovements, fmt, uid, Product, StockMovement } from '../store';
import { ArrowUpDown, Plus, AlertTriangle } from 'lucide-react';

const REASONS = ['Physical count correction', 'Damaged item', 'Theft/loss', 'Supplier return', 'Manual restock', 'Other'];

export default function Stock() {
  const [products, setProducts] = useState(getProducts);
  const [movements, setMovements] = useState(getMovements);
  const [tab, setTab] = useState<'overview' | 'movements' | 'adjust'>('overview');
  const [adjustProduct, setAdjustProduct] = useState('');
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustReason, setAdjustReason] = useState(REASONS[0]);
  const [adjustNote, setAdjustNote] = useState('');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');

  const lowStock = products.filter(p => p.active && p.qty <= p.reorderPoint);

  function applyAdjustment() {
    const { adminPin } = JSON.parse(localStorage.getItem('inv_settings') || '{"adminPin":"1234"}');
    if (pin !== adminPin) { setPinError('Incorrect admin PIN'); return; }
    if (!adjustProduct) return;
    const product = products.find(p => p.id === adjustProduct);
    if (!product) return;
    const newQty = Math.max(0, product.qty + adjustQty);
    const updated = products.map(p => p.id === adjustProduct ? { ...p, qty: newQty } : p);
    const mv: StockMovement = {
      id: uid(), productId: adjustProduct, type: 'adjustment',
      qty: adjustQty, reason: `${adjustReason}${adjustNote ? ': ' + adjustNote : ''}`,
      userId: 'admin', timestamp: new Date().toISOString(),
    };
    setProducts(updated); saveProducts(updated);
    setMovements(prev => [...prev, mv]); saveMovements([...movements, mv]);
    setAdjustQty(0); setAdjustReason(REASONS[0]); setAdjustNote(''); setPin(''); setPinError('');
    setTab('movements');
  }

  const typeColors: Record<string, string> = { sale: '#6b7280', restock: '#22c55e', adjustment: '#f59e0b', return: '#3b82f6', damage: '#ef4444' };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Stock Control</h1>
        <p style={{ color: 'var(--muted-foreground)', margin: '4px 0 0', fontSize: 13 }}>Real-time stock levels and movement log</p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['overview', 'movements', 'adjust'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '7px 16px', borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 500,
            background: tab === t ? 'var(--primary)' : 'var(--secondary)',
            color: tab === t ? 'var(--primary-foreground)' : 'var(--foreground)',
            textTransform: 'capitalize',
          }}>{t === 'adjust' ? 'Manual Adjust (Admin)' : t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          {lowStock.length > 0 && (
            <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#ef4444' }}>
              <AlertTriangle size={14} /> {lowStock.length} products at or below reorder point
            </div>
          )}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--secondary)', borderBottom: '1px solid var(--border)' }}>
                  {['Product', 'SKU', 'Location', 'On Hand', 'Reorder At', 'Reorder Qty', 'Status'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.filter(p => p.active).map((p, i) => {
                  const isLow = p.qty <= p.reorderPoint;
                  const isWarning = !isLow && p.qty <= p.reorderPoint * 2;
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 500 }}>{p.name}</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono-face)', fontSize: 11, color: 'var(--muted-foreground)' }}>{p.sku}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12 }}>{p.location || '—'}</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono-face)', fontWeight: 700, color: isLow ? '#ef4444' : isWarning ? '#f59e0b' : 'var(--foreground)' }}>
                        {isLow && <AlertTriangle size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />}
                        {p.qty}
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono-face)', fontSize: 12 }}>{p.reorderPoint}</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono-face)', fontSize: 12 }}>{p.reorderQty}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ background: isLow ? 'rgba(239,68,68,0.15)' : isWarning ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.15)', color: isLow ? '#ef4444' : isWarning ? '#f59e0b' : '#22c55e', border: `1px solid ${isLow ? 'rgba(239,68,68,0.3)' : isWarning ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.3)'}`, borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 600 }}>
                          {isLow ? 'REORDER NOW' : isWarning ? 'RUNNING LOW' : 'OK'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'movements' && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--secondary)', borderBottom: '1px solid var(--border)' }}>
                {['Timestamp', 'Product', 'Type', 'Qty Change', 'Reason', 'User'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...movements].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((m, i) => {
                const product = products.find(p => p.id === m.productId);
                return (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 14px', fontSize: 11, fontFamily: 'var(--font-mono-face)', color: 'var(--muted-foreground)' }}>{new Date(m.timestamp).toLocaleString('en-NG')}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 500 }}>{product?.name || m.productId}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ background: `${typeColors[m.type]}22`, color: typeColors[m.type], border: `1px solid ${typeColors[m.type]}44`, borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>{m.type}</span>
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono-face)', fontSize: 13, fontWeight: 700, color: m.qty > 0 ? '#22c55e' : '#ef4444' }}>
                      {m.qty > 0 ? '+' : ''}{m.qty}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12 }}>{m.reason}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12 }}>{m.userId}</td>
                  </tr>
                );
              })}
              {movements.length === 0 && <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--muted-foreground)' }}>No movements recorded</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'adjust' && (
        <div style={{ maxWidth: 480 }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Product</label>
                <select value={adjustProduct} onChange={e => setAdjustProduct(e.target.value)} style={{ width: '100%' }}>
                  <option value="">Select product…</option>
                  {products.filter(p => p.active).map(p => <option key={p.id} value={p.id}>{p.name} (current: {p.qty})</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Quantity Change (+/-)</label>
                <input type="number" value={adjustQty} onChange={e => setAdjustQty(+e.target.value)} style={{ width: '100%' }} placeholder="e.g. -3 to remove, +10 to add" />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Reason</label>
                <select value={adjustReason} onChange={e => setAdjustReason(e.target.value)} style={{ width: '100%' }}>
                  {REASONS.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Additional note</label>
                <input value={adjustNote} onChange={e => setAdjustNote(e.target.value)} placeholder="Optional note" style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Admin PIN (required)</label>
                <input type="password" value={pin} onChange={e => { setPin(e.target.value); setPinError(''); }} placeholder="••••" style={{ width: '100%', letterSpacing: 6 }} maxLength={8} />
                {pinError && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{pinError}</div>}
              </div>
              <button onClick={applyAdjustment} style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', borderRadius: 'var(--radius)', padding: '10px 20px', fontWeight: 600, marginTop: 4 }}>
                Apply Adjustment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
