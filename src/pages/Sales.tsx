import { useState } from 'react';
import { fmt, Sale, StockMovement, uid, ReturnedItem } from '../store';
import { useData } from '../DataContext';
import { Search, Mail, CheckCircle2, RotateCcw, AlertCircle } from 'lucide-react';
import { sendEODSalesReportEmail } from '../lib/resend';

export default function Sales() {
  const { sales, customers, products, setSales, setProducts, addStockMovement, setCustomers } = useData();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Return Modal State
  const [selectedReturnSale, setSelectedReturnSale] = useState<Sale | null>(null);
  const [returnItemIndex, setReturnItemIndex] = useState<number>(0);
  const [returnQty, setReturnQty] = useState<number>(1);
  const [returnReason, setReturnReason] = useState<string>('Defective item');
  const [returnNote, setReturnNote] = useState<string>('');
  const [returnError, setReturnError] = useState<string | null>(null);

  const filtered = [...sales]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .filter(s => {
      const q = search.toLowerCase();
      return !q || s.id.includes(q) || s.items.some(i => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q));
    });

  const totalRevenue = filtered.reduce((a, s) => a + s.total, 0);
  const totalProfit = filtered.reduce((a, s) => a + s.profit, 0);

  async function sendEodReport() {
    setEmailSending(true);
    setEmailSent(false);

    const todayStr = new Date().toDateString();
    const todaySales = sales.filter(s => new Date(s.timestamp).toDateString() === todayStr);
    const dayRev = todaySales.reduce((a, s) => a + s.total, 0);
    const dayProf = todaySales.reduce((a, s) => a + s.profit, 0);

    const ok = await sendEODSalesReportEmail(todaySales, dayRev, dayProf);
    setEmailSending(false);
    if (ok) {
      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 5000);
    }
  }

  function openReturnModal(sale: Sale, itemIdx: number = 0) {
    setSelectedReturnSale(sale);
    setReturnItemIndex(itemIdx);
    setReturnQty(1);
    setReturnReason('Defective item');
    setReturnNote('');
    setReturnError(null);
  }

  async function processReturnSubmit() {
    if (!selectedReturnSale) return;
    const targetItem = selectedReturnSale.items[returnItemIndex];
    if (!targetItem) return;

    if (returnQty <= 0 || returnQty > targetItem.qty) {
      setReturnError(`Return quantity must be between 1 and ${targetItem.qty}`);
      return;
    }

    const refundAmount = targetItem.unitPrice * returnQty;
    const refundProfit = (targetItem.unitPrice - (targetItem.costPrice || 0)) * returnQty;

    // 1. Log return stock movement & restore inventory
    const product = products.find(p => p.id === targetItem.productId);
    if (product) {
      const newQty = product.qty + returnQty;
      const mv: StockMovement = {
        id: uid(),
        productId: product.id,
        type: 'return',
        qty: returnQty,
        reason: `Returned from Sale #${selectedReturnSale.id}: ${returnReason}${returnNote ? ' - ' + returnNote : ''}`,
        userId: 'admin',
        saleId: selectedReturnSale.id,
        timestamp: new Date().toISOString(),
      };
      setProducts(products.map(p => p.id === product.id ? { ...p, qty: newQty } : p));
      await addStockMovement(mv, product.name, product.sku, newQty);
    }

    // 2. Record returned item on the sale audit log and adjust sale totals
    const newReturnedItem: ReturnedItem = {
      productId: targetItem.productId,
      qty: returnQty,
      reason: `${returnReason}${returnNote ? ': ' + returnNote : ''}`,
      returnedAt: new Date().toISOString(),
    };

    const updatedSale: Sale = {
      ...selectedReturnSale,
      total: Math.max(0, selectedReturnSale.total - refundAmount),
      profit: Math.max(0, selectedReturnSale.profit - refundProfit),
      returnedItems: [...(selectedReturnSale.returnedItems || []), newReturnedItem],
    };

    setSales(sales.map(s => s.id === selectedReturnSale.id ? updatedSale : s));

    // 3. Adjust customer balance if sale was credit/debt
    if (selectedReturnSale.customerId && selectedReturnSale.payment === 'credit') {
      const cust = customers.find(c => c.id === selectedReturnSale.customerId);
      if (cust) {
        const newBalance = Math.max(0, cust.balance - refundAmount);
        setCustomers(customers.map(c => c.id === cust.id ? { ...c, balance: newBalance } : c));
      }
    }

    setSelectedReturnSale(null);
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Sale History & Returns</h1>
          <p style={{ color: 'var(--muted-foreground)', margin: '4px 0 0', fontSize: 13 }}>{sales.length} transactions — audited history with returns support</p>
        </div>
        <button
          onClick={sendEodReport}
          disabled={emailSending}
          style={{
            background: emailSent ? '#22c55e' : 'var(--primary)',
            color: 'var(--primary-foreground)',
            border: 'none',
            borderRadius: 'var(--radius)',
            padding: '9px 16px',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: emailSending ? 'not-allowed' : 'pointer',
          }}
        >
          {emailSent ? <CheckCircle2 size={15} /> : <Mail size={15} />}
          {emailSending ? 'Sending Report…' : emailSent ? 'Report Emailed to Admin!' : 'Send End-of-Day Sales Report'}
        </button>
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
              {['Sale ID', 'Date', 'Items', 'Customer', 'Payment', 'Total', 'Profit', 'Actions', ''].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => {
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
                    <td style={{ padding: '10px 14px' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); openReturnModal(s, 0); }}
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: 4, padding: '4px 8px', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer'
                        }}
                      >
                        <RotateCcw size={12} /> Return / Refund
                      </button>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--muted-foreground)' }}>{expanded === s.id ? '▲' : '▼'}</td>
                  </tr>
                  {expanded === s.id && (
                    <tr key={`${s.id}-exp`} style={{ background: 'var(--secondary)' }}>
                      <td colSpan={9} style={{ padding: '12px 14px' }}>
                        {s.items.map((item, j) => (
                          <div key={j} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: j < s.items.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 12 }}>
                            <div style={{ display: 'flex', gap: 16 }}>
                              <span style={{ fontWeight: 600 }}>{item.name}</span>
                              <span style={{ fontFamily: 'var(--font-mono-face)', color: 'var(--muted-foreground)' }}>{item.sku}</span>
                              <span>× {item.qty}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                              <span style={{ fontFamily: 'var(--font-mono-face)' }}>{fmt(item.unitPrice)} each</span>
                              <span style={{ fontFamily: 'var(--font-mono-face)', fontWeight: 600 }}>{fmt(item.unitPrice * item.qty)}</span>
                              <button
                                onClick={() => openReturnModal(s, j)}
                                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}
                              >
                                Return item
                              </button>
                            </div>
                          </div>
                        ))}
                        {s.returnedItems && s.returnedItems.length > 0 && (
                          <div style={{ marginTop: 10, background: 'rgba(239, 68, 68, 0.08)', padding: 8, borderRadius: 6, fontSize: 11 }}>
                            <strong style={{ color: '#ef4444' }}>Returned Items:</strong>
                            {s.returnedItems.map((ret, rIdx) => (
                              <div key={rIdx} style={{ color: 'var(--muted-foreground)', marginTop: 2 }}>
                                • {ret.qty} unit(s) returned ({ret.reason}) on {new Date(ret.returnedAt).toLocaleDateString()}
                              </div>
                            ))}
                          </div>
                        )}
                        {s.note && <div style={{ marginTop: 8, fontSize: 11, color: 'var(--muted-foreground)' }}>Note: {s.note}</div>}
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={9} style={{ padding: 32, textAlign: 'center', color: 'var(--muted-foreground)' }}>
                {sales.length === 0 ? 'No sales recorded yet' : 'No results match your search'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Return & Refund Modal */}
      {selectedReturnSale && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, width: '100%', maxWidth: 440, padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 12px' }}>Process Sale Return / Refund</h2>
            <p style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 16 }}>
              Original Sale <strong>#{selectedReturnSale.id}</strong> — Restores inventory and adjusts financial totals without destroying transaction audit history.
            </p>

            {returnError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '8px 12px', borderRadius: 6, fontSize: 12, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertCircle size={14} /> {returnError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--muted-foreground)' }}>Select Item to Return</label>
                <select
                  value={returnItemIndex}
                  onChange={e => setReturnItemIndex(+e.target.value)}
                  style={{ width: '100%' }}
                >
                  {selectedReturnSale.items.map((item, idx) => (
                    <option key={idx} value={idx}>
                      {item.name} (Qty sold: {item.qty}) — {fmt(item.unitPrice)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--muted-foreground)' }}>Quantity Returning</label>
                <input
                  type="number"
                  min="1"
                  max={selectedReturnSale.items[returnItemIndex]?.qty || 1}
                  value={returnQty}
                  onChange={e => setReturnQty(+e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--muted-foreground)' }}>Return Reason</label>
                <select value={returnReason} onChange={e => setReturnReason(e.target.value)} style={{ width: '100%' }}>
                  <option value="Defective item">Defective / Damaged Item</option>
                  <option value="Wrong part ordered">Wrong Part Ordered</option>
                  <option value="Customer change of mind">Customer Change of Mind</option>
                  <option value="Exchange">Product Exchange</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--muted-foreground)' }}>Additional Note</label>
                <input
                  value={returnNote}
                  onChange={e => setReturnNote(e.target.value)}
                  placeholder="Optional return details..."
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
                <button type="button" onClick={() => setSelectedReturnSale(null)} style={{ padding: '8px 14px', background: 'var(--secondary)', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                <button type="button" onClick={processReturnSubmit} style={{ padding: '8px 14px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}>Process Return</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
