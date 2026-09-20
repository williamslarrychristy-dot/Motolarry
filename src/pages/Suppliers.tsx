import { useState } from 'react';
import { uid, Supplier, PurchaseOrder } from '../store';
import { useData } from '../DataContext';
import { Plus, X, Save, Truck } from 'lucide-react';

const EMPTY: Omit<Supplier, 'id'> = { name: '', contact: '', phone: '', email: '', parts: '' };

export default function Suppliers() {
  const { suppliers, pos, products, setSuppliers, setPOs, setProducts } = useData();
  const [tab, setTab] = useState<'suppliers' | 'orders'>('suppliers');
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [newPO, setNewPO] = useState<{ supplierId: string; items: { productId: string; qty: number; unitCost: number }[] } | null>(null);

  function saveSupplier() {
    if (isNew) setSuppliers([...suppliers, { ...form, id: uid() }]);
    else if (editing) setSuppliers(suppliers.map(s => s.id === editing.id ? { ...editing, ...form } : s));
    setIsNew(false); setEditing(null);
  }

  function createPO() {
    if (!newPO?.supplierId || !newPO.items.length) return;
    const items = newPO.items.filter(i => i.productId && i.qty > 0).map(i => {
      const p = products.find(x => x.id === i.productId);
      return { productId: i.productId, name: p?.name || '', qty: i.qty, unitCost: i.unitCost || p?.costPrice || 0 };
    });
    const po: PurchaseOrder = { id: uid(), supplierId: newPO.supplierId, items, status: 'draft', createdAt: new Date().toISOString() };
    setPOs([...pos, po]);
    setNewPO(null);
  }

  function receivePO(id: string) {
    const po = pos.find(p => p.id === id);
    if (!po) return;
    setProducts(products.map(p => {
      const item = po.items.find(i => i.productId === p.id);
      return item ? { ...p, qty: p.qty + item.qty } : p;
    }));
    setPOs(pos.map(p => p.id === id ? { ...p, status: 'received' as const, receivedAt: new Date().toISOString() } : p));
  }

  function f(k: keyof typeof form, v: string) { setForm(prev => ({ ...prev, [k]: v })); }
  function openNew() { setForm(EMPTY); setIsNew(true); setEditing(null); }
  function openEdit(s: Supplier) { const { id, ...rest } = s; setForm(rest); setEditing(s); setIsNew(false); }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Suppliers & Purchase Orders</h1>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['suppliers', 'orders'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '7px 16px', borderRadius: 'var(--radius)', fontSize: 13, background: tab === t ? 'var(--primary)' : 'var(--secondary)', color: tab === t ? 'var(--primary-foreground)' : 'var(--foreground)', textTransform: 'capitalize' }}>
            {t === 'orders' ? 'Purchase Orders' : 'Suppliers'}
          </button>
        ))}
      </div>

      {tab === 'suppliers' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button onClick={openNew} style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', borderRadius: 'var(--radius)', padding: '8px 14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <Plus size={14} /> Add Supplier
              </button>
            </div>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              {suppliers.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted-foreground)' }}>No suppliers yet</div>
              ) : suppliers.map((s, i) => (
                <div key={s.id} onClick={() => openEdit(s)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderBottom: i < suppliers.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--secondary)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)', flexShrink: 0 }}>
                    <Truck size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{s.contact} · {s.phone}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{s.parts}</div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{pos.filter(p => p.supplierId === s.id).length} POs</div>
                </div>
              ))}
            </div>
          </div>

          {(isNew || editing) && (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, height: 'fit-content' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{isNew ? 'New Supplier' : 'Edit Supplier'}</h3>
                <button onClick={() => { setIsNew(false); setEditing(null); }} style={{ background: 'none', color: 'var(--muted-foreground)' }}><X size={16} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(['name', 'contact', 'phone', 'email', 'parts'] as const).map(k => (
                  <div key={k}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>{k === 'parts' ? 'Parts Supplied' : k.charAt(0).toUpperCase() + k.slice(1)}</label>
                    <input value={form[k]} onChange={e => f(k, e.target.value)} style={{ width: '100%' }} />
                  </div>
                ))}
              </div>
              <button onClick={saveSupplier} style={{ width: '100%', marginTop: 16, background: 'var(--primary)', color: 'var(--primary-foreground)', borderRadius: 'var(--radius)', padding: 10, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Save size={13} /> Save
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'orders' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button onClick={() => setNewPO({ supplierId: '', items: [{ productId: '', qty: 1, unitCost: 0 }] })} style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', borderRadius: 'var(--radius)', padding: '8px 14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <Plus size={14} /> New Purchase Order
            </button>
          </div>

          {newPO && (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>New Purchase Order</h3>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Supplier</label>
                <select value={newPO.supplierId} onChange={e => setNewPO({ ...newPO, supplierId: e.target.value })} style={{ width: '100%', maxWidth: 320 }}>
                  <option value="">Select supplier…</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              {newPO.items.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-end' }}>
                  <div style={{ flex: 2 }}>
                    <label style={{ fontSize: 10, color: 'var(--muted-foreground)', display: 'block', marginBottom: 2 }}>Product</label>
                    <select value={item.productId} onChange={e => { const items = [...newPO.items]; items[idx] = { ...items[idx], productId: e.target.value }; setNewPO({ ...newPO, items }); }} style={{ width: '100%' }}>
                      <option value="">Select…</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 10, color: 'var(--muted-foreground)', display: 'block', marginBottom: 2 }}>Qty</label>
                    <input type="number" value={item.qty} onChange={e => { const items = [...newPO.items]; items[idx] = { ...items[idx], qty: +e.target.value }; setNewPO({ ...newPO, items }); }} style={{ width: '100%' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 10, color: 'var(--muted-foreground)', display: 'block', marginBottom: 2 }}>Unit Cost</label>
                    <input type="number" value={item.unitCost} onChange={e => { const items = [...newPO.items]; items[idx] = { ...items[idx], unitCost: +e.target.value }; setNewPO({ ...newPO, items }); }} style={{ width: '100%' }} />
                  </div>
                  <button onClick={() => setNewPO({ ...newPO, items: newPO.items.filter((_, i) => i !== idx) })} style={{ background: 'none', color: '#ef4444', padding: '8px 6px' }}><X size={14} /></button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={() => setNewPO({ ...newPO, items: [...newPO.items, { productId: '', qty: 1, unitCost: 0 }] })} style={{ background: 'var(--secondary)', color: 'var(--foreground)', borderRadius: 'var(--radius)', padding: '7px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Plus size={12} /> Add Item
                </button>
                <button onClick={createPO} style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', borderRadius: 'var(--radius)', padding: '7px 16px', fontWeight: 600, fontSize: 12 }}>Create PO</button>
                <button onClick={() => setNewPO(null)} style={{ background: 'none', color: 'var(--muted-foreground)', fontSize: 12 }}>Cancel</button>
              </div>
            </div>
          )}

          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--secondary)', borderBottom: '1px solid var(--border)' }}>
                  {['PO ID', 'Supplier', 'Items', 'Created', 'Status', 'Action'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pos.map((po) => {
                  const supplier = suppliers.find(s => s.id === po.supplierId);
                  const colors = { draft: '#6b7280', sent: '#f59e0b', received: '#22c55e' };
                  return (
                    <tr key={po.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono-face)', fontSize: 11, color: 'var(--muted-foreground)' }}>#{po.id}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 500 }}>{supplier?.name || '—'}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12 }}>{po.items.length} item(s)</td>
                      <td style={{ padding: '10px 14px', fontSize: 11 }}>{new Date(po.createdAt).toLocaleDateString('en-NG')}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ background: `${colors[po.status]}22`, color: colors[po.status], border: `1px solid ${colors[po.status]}44`, borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>{po.status}</span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {po.status !== 'received' && (
                          <button onClick={() => receivePO(po.id)} style={{ background: 'var(--secondary)', color: 'var(--foreground)', borderRadius: 4, padding: '4px 10px', fontSize: 11 }}>Mark Received</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {pos.length === 0 && <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--muted-foreground)' }}>No purchase orders yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
