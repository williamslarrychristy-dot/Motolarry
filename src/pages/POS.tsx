import { useState } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, CheckCircle, Receipt, Split, Sparkles, Loader2 } from 'lucide-react';
import { fmt, uid, CartItem, Sale, Product, saveSingleSale, saveSingleMovement, saveSingleProduct, saveSingleCustomer } from '../store';
import { useData } from '../DataContext';
import { sendStockMovementAlert } from '../lib/resend';
import { queryAIAssistant } from '../lib/ai';

export default function POS() {
  const { products, sales, movements, customers, setProducts, setSales, setMovements, setCustomers } = useData();
  const [search, setSearch] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiMatchedIds, setAiMatchedIds] = useState<string[] | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [payment, setPayment] = useState<Sale['payment']>('cash');
  const [isSplit, setIsSplit] = useState(false);
  const [splitMethod1, setSplitMethod1] = useState<Sale['payment']>('cash');
  const [splitAmount1, setSplitAmount1] = useState<number>(0);
  const [splitMethod2, setSplitMethod2] = useState<Sale['payment']>('transfer');
  const [splitAmount2, setSplitAmount2] = useState<number>(0);
  const [customerId, setCustomerId] = useState('');
  const [note, setNote] = useState('');
  const [completed, setCompleted] = useState<Sale | null>(null);

  const activeProducts = products.filter(p => p.active);

  const filtered = !search ? activeProducts : activeProducts.filter(p => {
    if (aiMatchedIds) {
      return aiMatchedIds.includes(p.id);
    }
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
      || p.barcode.includes(q) || p.aliases.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
  });

  async function handleAISearch() {
    if (!search.trim()) return;
    setAiLoading(true);
    setAiResponse(null);
    setAiMatchedIds(null);

    const res = await queryAIAssistant(search, products);
    setAiLoading(false);
    setAiResponse(res.answer);
    setAiMatchedIds(res.matchedProductIds);
  }

  function clearAISearch() {
    setSearch('');
    setAiResponse(null);
    setAiMatchedIds(null);
  }

  function addToCart(p: Product) {
    setCart(prev => {
      const existing = prev.find(c => c.product.id === p.id);
      if (existing) {
        if (existing.qty >= p.qty) return prev;
        return prev.map(c => c.product.id === p.id ? { ...c, qty: c.qty + 1 } : c);
      }
      if (p.qty < 1) return prev;
      return [...prev, { product: p, qty: 1 }];
    });
  }

  function updateQty(id: string, delta: number) {
    setCart(prev => prev.map(c => {
      if (c.product.id !== id) return c;
      const nq = c.qty + delta;
      if (nq < 1 || nq > c.product.qty) return c;
      return { ...c, qty: nq };
    }));
  }

  function remove(id: string) {
    setCart(prev => prev.filter(c => c.product.id !== id));
  }

  const subtotal = cart.reduce((a, c) => a + c.product.salePrice * c.qty, 0);

  // Profit calculation rule: If costPrice is 0 or missing, profit = salePrice
  const profit = cart.reduce((a, c) => {
    const itemCost = (c.product.costPrice && c.product.costPrice > 0) ? c.product.costPrice : 0;
    const itemProfit = c.product.salePrice - itemCost;
    return a + itemProfit * c.qty;
  }, 0);

  function checkout() {
    if (cart.length === 0) return;

    let salePayments = undefined;
    if (isSplit) {
      salePayments = [
        { method: splitMethod1, amount: Number(splitAmount1) || 0 },
        { method: splitMethod2, amount: Number(splitAmount2) || 0 },
      ];
    }

    const sale: Sale = {
      id: uid(),
      payment: isSplit ? splitMethod1 : payment,
      payments: salePayments,
      customerId: customerId || undefined,
      note,
      items: cart.map(c => {
        const itemCost = (c.product.costPrice && c.product.costPrice > 0) ? c.product.costPrice : 0;
        return {
          productId: c.product.id,
          name: c.product.name,
          sku: c.product.sku,
          qty: c.qty,
          unitPrice: c.product.salePrice,
          costPrice: itemCost,
        };
      }),
      total: subtotal,
      profit,
      timestamp: new Date().toISOString(),
    };

    // Save sale to database
    saveSingleSale(sale).catch(() => {});

    // Deduct stocks automatically and save single product rows
    const updatedProducts = products.map(p => {
      const item = cart.find(c => c.product.id === p.id);
      if (item) {
        const updated = { ...p, qty: p.qty - item.qty };
        saveSingleProduct(updated).catch(() => {});

        // Trigger email notification for stock subtraction
        sendStockMovementAlert({
          productName: p.name,
          sku: p.sku,
          type: 'sale',
          qty: -item.qty,
          newQty: updated.qty,
          reason: `POS Sale #${sale.id.slice(-6)}`,
        }).catch(() => {});

        return updated;
      }
      return p;
    });

    // Record stock movements
    const newMovements = cart.map(c => {
      const mv = {
        id: uid(),
        productId: c.product.id,
        type: 'sale' as const,
        qty: -c.qty,
        reason: `POS Sale ${sale.id}`,
        userId: 'admin',
        timestamp: sale.timestamp,
        saleId: sale.id,
      };
      saveSingleMovement(mv).catch(() => {});
      return mv;
    });

    // Update customer credit balance if paid on credit
    if ((payment === 'credit' || (isSplit && (splitMethod1 === 'credit' || splitMethod2 === 'credit'))) && customerId) {
      const creditAmt = isSplit
        ? (splitMethod1 === 'credit' ? splitAmount1 : 0) + (splitMethod2 === 'credit' ? splitAmount2 : 0)
        : subtotal;

      const updatedCustomers = customers.map(c => {
        if (c.id === customerId) {
          const updated = { ...c, balance: c.balance + creditAmt };
          saveSingleCustomer(updated).catch(() => {});
          return updated;
        }
        return c;
      });
      setCustomers(updatedCustomers);
    }

    setProducts(updatedProducts);
    setSales([...sales, sale]);
    setMovements([...movements, ...newMovements]);

    setCart([]);
    setNote('');
    setCustomerId('');
    setIsSplit(false);
    setCompleted(sale);
  }

  if (completed) {
    return (
      <div style={{ maxWidth: 500, margin: '0 auto', padding: 40 }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 32, textAlign: 'center' }}>
          <CheckCircle size={48} color="var(--primary)" style={{ marginBottom: 16 }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>Sale Complete!</h2>
          <p style={{ color: 'var(--muted-foreground)', fontSize: 13, margin: '0 0 24px' }}>Sale #{completed.id}</p>
          <div style={{ background: 'var(--secondary)', borderRadius: 'var(--radius)', padding: '16px 20px', marginBottom: 20, textAlign: 'left' }}>
            {completed.items.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < completed.items.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 13 }}>
                <span>{item.name} × {item.qty}</span>
                <span style={{ fontFamily: 'var(--font-mono-face)' }}>{fmt(item.unitPrice * item.qty)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', fontWeight: 700, fontSize: 15 }}>
              <span>Total</span>
              <span style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono-face)' }}>{fmt(completed.total)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted-foreground)', marginTop: 6 }}>
              <span>Profit</span><span style={{ fontFamily: 'var(--font-mono-face)' }}>{fmt(completed.profit)}</span>
            </div>
            {completed.payments ? (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted-foreground)' }}>
                Split Payment: {completed.payments.map(p => `${p.method.toUpperCase()} (${fmt(p.amount)})`).join(' + ')}
              </div>
            ) : (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted-foreground)' }}>Payment: <strong style={{ color: 'var(--foreground)', textTransform: 'capitalize' }}>{completed.payment}</strong></div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={() => setCompleted(null)} style={{ background: 'var(--primary)', border: 'none', color: 'var(--primary-foreground)', borderRadius: 'var(--radius)', padding: '10px 24px', fontWeight: 600, cursor: 'pointer' }}>New Sale</button>
            <button onClick={() => window.print()} style={{ background: 'var(--secondary)', border: 'none', color: 'var(--foreground)', borderRadius: 'var(--radius)', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <Receipt size={14} /> Print Receipt
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, height: 'calc(100vh - 100px)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ marginBottom: 12 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 12px' }}>POS / Checkout</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
              <input
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  if (aiMatchedIds) setAiMatchedIds(null);
                }}
                placeholder="Search by name, SKU, barcode, alias, or customer description…"
                style={{ width: '100%', paddingLeft: 32 }}
              />
            </div>
            <button
              onClick={handleAISearch}
              disabled={aiLoading || !search.trim()}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: '#fff',
                border: 'none', borderRadius: 'var(--radius)', padding: '0 14px',
                fontWeight: 600, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {aiLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={14} />}
              AI Search
            </button>
            {(search || aiResponse) && (
              <button
                onClick={clearAISearch}
                style={{
                  background: 'var(--secondary)', border: 'none', color: 'var(--foreground)',
                  borderRadius: 'var(--radius)', padding: '0 10px', fontSize: 12, cursor: 'pointer',
                }}
              >
                Clear
              </button>
            )}
          </div>

          {aiResponse && (
            <div style={{ marginTop: 8, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#7c3aed', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={14} flexShrink={0} />
              <div><strong>AI Assist:</strong> {aiResponse}</div>
            </div>
          )}
        </div>

        {activeProducts.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)', fontSize: 13 }}>
            No products yet — add products in the Products page first
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, alignContent: 'start' }}>
            {filtered.map(p => {
              const inCart = cart.find(c => c.product.id === p.id);
              return (
                <button key={p.id} onClick={() => addToCart(p)} style={{
                  background: inCart ? 'rgba(37,99,235,0.1)' : 'var(--card)',
                  border: `1px solid ${inCart ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius)', padding: '12px', textAlign: 'left',
                  cursor: p.qty < 1 ? 'not-allowed' : 'pointer', opacity: p.qty < 1 ? 0.4 : 1,
                }}>
                  {p.imageUrl && <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 4, marginBottom: 8 }} />}
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono-face)', marginBottom: 4 }}>{p.sku}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)', fontFamily: 'var(--font-mono-face)' }}>{fmt(p.salePrice)}</div>
                  <div style={{ fontSize: 11, color: p.qty <= p.reorderPoint ? '#ef4444' : 'var(--muted-foreground)', marginTop: 4 }}>{p.qty} in stock</div>
                  {inCart && <div style={{ fontSize: 10, color: 'var(--primary)', marginTop: 4, fontWeight: 600 }}>× {inCart.qty} in cart</div>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShoppingCart size={15} /><span style={{ fontWeight: 700, fontSize: 14 }}>Cart ({cart.length} items)</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {cart.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 13 }}>Tap a product to add it</div>
          ) : cart.map(item => (
            <div key={item.product.id} style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono-face)' }}>{fmt(item.product.salePrice)} × {item.qty}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button onClick={() => updateQty(item.product.id, -1)} style={{ background: 'var(--secondary)', border: 'none', borderRadius: 4, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Minus size={10} /></button>
                <span style={{ width: 24, textAlign: 'center', fontSize: 13, fontFamily: 'var(--font-mono-face)' }}>{item.qty}</span>
                <button onClick={() => updateQty(item.product.id, 1)} style={{ background: 'var(--secondary)', border: 'none', borderRadius: 4, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Plus size={10} /></button>
                <button onClick={() => remove(item.product.id)} style={{ background: 'none', border: 'none', color: '#ef4444', marginLeft: 4, padding: 2, cursor: 'pointer' }}><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Customer (optional)</label>
            <select value={customerId} onChange={e => setCustomerId(e.target.value)} style={{ width: '100%' }}>
              <option value="">Walk-in customer</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} — {c.motorcycle}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>Payment Method</label>
              <button
                type="button"
                onClick={() => {
                  setIsSplit(!isSplit);
                  if (!isSplit) {
                    setSplitAmount1(Math.round(subtotal / 2));
                    setSplitAmount2(subtotal - Math.round(subtotal / 2));
                  }
                }}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <Split size={12} /> {isSplit ? 'Single Payment' : 'Split Payment'}
              </button>
            </div>

            {isSplit ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--secondary)', padding: 10, borderRadius: 'var(--radius)' }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <select value={splitMethod1} onChange={e => setSplitMethod1(e.target.value as any)} style={{ flex: 1, fontSize: 12 }}>
                    <option value="cash">Cash</option>
                    <option value="transfer">Transfer</option>
                    <option value="card">Card</option>
                    <option value="credit">Credit</option>
                  </select>
                  <input
                    type="number"
                    value={splitAmount1}
                    onChange={e => {
                      const val = Number(e.target.value) || 0;
                      setSplitAmount1(val);
                      setSplitAmount2(Math.max(0, subtotal - val));
                    }}
                    placeholder="Amount 1"
                    style={{ width: 110, fontSize: 12 }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <select value={splitMethod2} onChange={e => setSplitMethod2(e.target.value as any)} style={{ flex: 1, fontSize: 12 }}>
                    <option value="transfer">Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="credit">Credit</option>
                  </select>
                  <input
                    type="number"
                    value={splitAmount2}
                    onChange={e => {
                      const val = Number(e.target.value) || 0;
                      setSplitAmount2(val);
                      setSplitAmount1(Math.max(0, subtotal - val));
                    }}
                    placeholder="Amount 2"
                    style={{ width: 110, fontSize: 12 }}
                  />
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {(['cash', 'transfer', 'card', 'credit'] as const).map(m => (
                  <button key={m} onClick={() => setPayment(m)} style={{ padding: '6px 10px', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 500, background: payment === m ? 'var(--primary)' : 'var(--secondary)', color: payment === m ? 'var(--primary-foreground)' : 'var(--foreground)', textTransform: 'capitalize', cursor: 'pointer' }}>{m}</button>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Customer Email / Note (optional)" style={{ width: '100%' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
            <span style={{ color: 'var(--muted-foreground)' }}>Subtotal</span>
            <span style={{ fontFamily: 'var(--font-mono-face)', fontWeight: 600 }}>{fmt(subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 12, color: 'var(--muted-foreground)' }}>
            <span>Profit</span><span style={{ fontFamily: 'var(--font-mono-face)' }}>{fmt(profit)}</span>
          </div>
          <button onClick={checkout} disabled={cart.length === 0} style={{ width: '100%', border: 'none', background: cart.length > 0 ? 'var(--primary)' : 'var(--secondary)', color: cart.length > 0 ? 'var(--primary-foreground)' : 'var(--muted-foreground)', borderRadius: 'var(--radius)', padding: '12px', fontWeight: 700, fontSize: 15, cursor: cart.length > 0 ? 'pointer' : 'not-allowed' }}>
            Complete Sale — {fmt(subtotal)}
          </button>
        </div>
      </div>
    </div>
  );
}
