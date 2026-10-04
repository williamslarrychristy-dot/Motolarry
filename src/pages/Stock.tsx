import { useState } from 'react';
import { uid, StockMovement, PurchaseOrder, fmt, saveSinglePO, saveSingleProduct, saveSingleMovement } from '../store';
import { useData } from '../DataContext';
import { AlertTriangle, ShoppingCart, CheckCircle, Plus, Truck, PackageCheck } from 'lucide-react';

const REASONS = ['Physical count correction', 'Damaged item', 'Theft/loss', 'Supplier return', 'Manual restock', 'Other'];

export default function Stock() {
  const { products, movements, pos, suppliers, settings, setProducts, addStockMovement, setPOs } = useData();
  const [tab, setTab] = useState<'overview' | 'movements' | 'purchases' | 'adjust'>('overview');

  // Manual Adjust State
  const [adjustProduct, setAdjustProduct] = useState('');
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustReason, setAdjustReason] = useState(REASONS[0]);
  const [adjustNote, setAdjustNote] = useState('');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Purchase Order State
  const [showPOModal, setShowPOModal] = useState(false);
  const [poSupplierId, setPoSupplierId] = useState('');
  const [poItems, setPoItems] = useState<{ productId: string; name: string; qty: number; unitCost: number }[]>([]);
  const [selectedProductToAdd, setSelectedProductToAdd] = useState('');
  const [productOrderQty, setProductOrderQty] = useState(10);

  const lowStock = products.filter(p => p.active && p.qty <= p.reorderPoint);

  async function applyAdjustment() {
    if (pin !== settings.adminPin) { setPinError('Incorrect admin PIN'); return; }
    if (!adjustProduct) return;
    const product = products.find(p => p.id === adjustProduct);
    if (!product) return;
    const newQty = Math.max(0, product.qty + adjustQty);
    const mv: StockMovement = {
      id: uid(), productId: adjustProduct, type: 'adjustment',
      qty: adjustQty, reason: `${adjustReason}${adjustNote ? ': ' + adjustNote : ''}`,
      userId: 'admin', timestamp: new Date().toISOString(),
    };
    setProducts(products.map(p => p.id === adjustProduct ? { ...p, qty: newQty } : p));
    await addStockMovement(mv, product.name, product.sku, newQty);
    setAdjustQty(0); setAdjustReason(REASONS[0]); setAdjustNote(''); setPin(''); setPinError('');
    setTab('movements');
  }

  function addProductToPO() {
    if (!selectedProductToAdd) return;
    const p = products.find(prod => prod.id === selectedProductToAdd);
    if (!p) return;

    if (poItems.some(item => item.productId === p.id)) return;

    setPoItems(prev => [...prev, {
      productId: p.id,
      name: p.name,
      qty: productOrderQty || 10,
      unitCost: p.costPrice || 0,
    }]);
    setSelectedProductToAdd('');
  }

  async function createPurchaseOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!poSupplierId || poItems.length === 0) {
      alert('Please select a supplier and add at least one product.');
      return;
    }

    const newPO: PurchaseOrder = {
      id: uid(),
      supplierId: poSupplierId,
      items: poItems,
      status: 'sent',
      createdAt: new Date().toISOString(),
    };

    await saveSinglePO(newPO);
    setPOs([newPO, ...pos]);
    setPoItems([]);
    setPoSupplierId('');
    setShowPOModal(false);
  }

  async function receivePurchaseOrder(po: PurchaseOrder) {
    if (po.status === 'received') return;
    if (!confirm(`Confirm receipt of Purchase Order #${po.id.slice(-6)}? Stock levels will be updated.`)) return;

    const updatedProducts = [...products];
    const newMovements: StockMovement[] = [];

    for (const item of po.items) {
      const pIndex = updatedProducts.findIndex(p => p.id === item.productId);
      if (pIndex !== -1) {
        const p = updatedProducts[pIndex];
        const newQty = p.qty + item.qty;
        updatedProducts[pIndex] = { ...p, qty: newQty, costPrice: item.unitCost || p.costPrice };
        saveSingleProduct(updatedProducts[pIndex]).catch(() => {});

        const mv: StockMovement = {
          id: uid(),
          productId: p.id,
          type: 'restock',
          qty: item.qty,
          reason: `PO #${po.id.slice(-6)} Received`,
          userId: 'admin',
          timestamp: new Date().toISOString(),
        };
        newMovements.push(mv);
        saveSingleMovement(mv).catch(() => {});
      }
    }

    const updatedPO: PurchaseOrder = { ...po, status: 'received', receivedAt: new Date().toISOString() };
    await saveSinglePO(updatedPO);

    setProducts(updatedProducts);
    setPOs(pos.map(p => p.id === po.id ? updatedPO : p));
  }

  const typeColors: Record<string, string> = { sale: '#6b7280', restock: '#22c55e', adjustment: '#f59e0b', return: '#3b82f6', damage: '#ef4444' };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Stock Control & Reorder Management</h1>
        <p style={{ color: 'var(--muted-foreground)', margin: '4px 0 0', fontSize: 13 }}>Real-time inventory levels, stock reordering, and audit trail</p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['overview', 'movements', 'purchases', 'adjust'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '7px 16px', borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 500, background: tab === t ? 'var(--primary)' : 'var(--secondary)', color: tab === t ? 'var(--primary-foreground)' : 'var(--foreground)', textTransform: 'capitalize' }}>
            {t === 'purchases' ? 'Purchases & Restock' : t === 'adjust' ? 'Manual Adjust (Admin)' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
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
                {products.filter(p => p.active).map((p) => {
                  const isLow = p.qty <= p.reorderPoint;
                  const isWarning = !isLow && p.qty <= p.reorderPoint * 2;
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 500 }}>{p.name}</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono-face)', fontSize: 11, color: 'var(--muted-foreground)' }}>{p.sku}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12 }}>{p.location || '—'}</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono-face)', fontWeight: 700, color: isLow ? '#ef4444' : isWarning ? '#f59e0b' : 'var(--foreground)' }}>
                        {isLow && <AlertTriangle size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />}{p.qty}
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
                {products.filter(p => p.active).length === 0 && (
                  <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: 'var(--muted-foreground)' }}>No products yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'purchases' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Stock Purchase Orders</h2>
              <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '2px 0 0' }}>Order inventory from suppliers and receive shipments cleanly</p>
            </div>
            <button
              onClick={() => setShowPOModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'var(--primary)', color: 'var(--primary-foreground)',
                border: 'none', borderRadius: 'var(--radius)', padding: '8px 14px',
                fontWeight: 600, fontSize: 13, cursor: 'pointer',
              }}
            >
              <Plus size={15} /> Create Purchase Order
            </button>
          </div>

          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--secondary)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--muted-foreground)' }}>PO ID</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--muted-foreground)' }}>Supplier</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--muted-foreground)' }}>Items</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--muted-foreground)' }}>Status</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--muted-foreground)' }}>Date Created</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--muted-foreground)', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pos.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--muted-foreground)' }}>
                      No purchase orders recorded yet. Click <strong>"Create Purchase Order"</strong> to start.
                    </td>
                  </tr>
                ) : pos.map(po => {
                  const supplier = suppliers.find(s => s.id === po.supplierId);
                  return (
                    <tr key={po.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono-face)', fontWeight: 600 }}>#{po.id.slice(-6)}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 500 }}>{supplier?.name || po.supplierId || 'Direct Supplier'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        {po.items.map((it, idx) => (
                          <div key={idx} style={{ fontSize: 12 }}>{it.name} × <strong>{it.qty}</strong> ({fmt(it.unitCost)} ea)</div>
                        ))}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          background: po.status === 'received' ? 'rgba(34,197,94,0.15)' : 'rgba(37,99,235,0.15)',
                          color: po.status === 'received' ? '#16a34a' : 'var(--primary)',
                          border: `1px solid ${po.status === 'received' ? 'rgba(34,197,94,0.3)' : 'rgba(37,99,235,0.3)'}`,
                          borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600, textTransform: 'capitalize',
                        }}>
                          {po.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono-face)', fontSize: 12, color: 'var(--muted-foreground)' }}>
                        {new Date(po.createdAt).toLocaleDateString('en-NG')}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        {po.status !== 'received' ? (
                          <button
                            onClick={() => receivePurchaseOrder(po)}
                            style={{
                              background: '#16a34a', color: '#fff', border: 'none',
                              borderRadius: 4, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            }}
                          >
                            Receive Order
                          </button>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Received</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {showPOModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, width: '100%', maxWidth: 520, padding: 24 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px' }}>Create Stock Purchase Order</h2>
                <form onSubmit={createPurchaseOrder} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--muted-foreground)' }}>Supplier *</label>
                    <select value={poSupplierId} onChange={e => setPoSupplierId(e.target.value)} required style={{ width: '100%', padding: '8px 12px' }}>
                      <option value="">Select Supplier...</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.parts || 'General Parts'})</option>)}
                    </select>
                  </div>

                  <div style={{ background: 'var(--secondary)', padding: 12, borderRadius: 8 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Add Products to Purchase Order</label>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <select value={selectedProductToAdd} onChange={e => setSelectedProductToAdd(e.target.value)} style={{ flex: 1, padding: '8px' }}>
                        <option value="">Select Product...</option>
                        {products.filter(p => p.active).map(p => <option key={p.id} value={p.id}>{p.name} (In stock: {p.qty})</option>)}
                      </select>
                      <input
                        type="number"
                        min="1"
                        placeholder="Order Qty"
                        value={productOrderQty}
                        onChange={e => setProductOrderQty(+e.target.value)}
                        style={{ width: 90, padding: '8px' }}
                      />
                      <button type="button" onClick={addProductToPO} style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 4, padding: '0 12px', fontWeight: 600, cursor: 'pointer' }}>Add</button>
                    </div>

                    {poItems.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                        {poItems.map((it, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card)', padding: '6px 10px', borderRadius: 4, fontSize: 12 }}>
                            <span><strong>{it.name}</strong> × {it.qty}</span>
                            <button type="button" onClick={() => setPoItems(poItems.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 11 }}>Remove</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                    <button type="button" onClick={() => setShowPOModal(false)} style={{ padding: '8px 14px', background: 'var(--secondary)', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                    <button type="submit" style={{ padding: '8px 14px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}>Save Purchase Order</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
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
              {[...movements].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((m) => {
                const product = products.find(p => p.id === m.productId);
                return (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 14px', fontSize: 11, fontFamily: 'var(--font-mono-face)', color: 'var(--muted-foreground)' }}>{new Date(m.timestamp).toLocaleString('en-NG')}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 500 }}>{product?.name || m.productId}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ background: `${typeColors[m.type]}22`, color: typeColors[m.type], border: `1px solid ${typeColors[m.type]}44`, borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>{m.type}</span>
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono-face)', fontSize: 13, fontWeight: 700, color: m.qty > 0 ? '#22c55e' : '#ef4444' }}>{m.qty > 0 ? '+' : ''}{m.qty}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12 }}>{m.reason}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12 }}>{m.userId}</td>
                  </tr>
                );
              })}
              {movements.length === 0 && <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--muted-foreground)' }}>No movements recorded yet</td></tr>}
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
              <button onClick={applyAdjustment} style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', borderRadius: 'var(--radius)', padding: '10px 20px', fontWeight: 600 }}>
                Apply Adjustment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
