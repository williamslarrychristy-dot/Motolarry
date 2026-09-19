import { useState } from 'react';
import { getCustomers, saveCustomers, getSales, fmt, uid, Customer } from '../store';
import { Plus, X, Save, User } from 'lucide-react';

const EMPTY: Omit<Customer, 'id' | 'createdAt'> = { name: '', phone: '', motorcycle: '', balance: 0 };

export default function Customers() {
  const [customers, setCustomers] = useState(getCustomers);
  const [sales] = useState(getSales);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState(EMPTY);

  function save() {
    let updated: Customer[];
    if (isNew) {
      updated = [...customers, { ...form, id: uid(), createdAt: new Date().toISOString() }];
    } else if (selected) {
      updated = customers.map(c => c.id === selected.id ? { ...selected, ...form } : c);
    } else return;
    setCustomers(updated); saveCustomers(updated);
    setIsNew(false); setSelected(null);
  }
  function openEdit(c: Customer) {
    const { id, createdAt, ...rest } = c;
    setForm(rest); setSelected(c); setIsNew(false);
  }
  function openNew() { setForm(EMPTY); setIsNew(true); setSelected(null); }
  function f(k: keyof typeof form, v: string | number) { setForm(prev => ({ ...prev, [k]: v })); }

  const customerSales = (id: string) => sales.filter(s => s.customerId === id);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Customers</h1>
            <p style={{ color: 'var(--muted-foreground)', margin: '4px 0 0', fontSize: 13 }}>{customers.length} registered</p>
          </div>
          <button onClick={openNew} style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', borderRadius: 'var(--radius)', padding: '8px 16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <Plus size={14} /> Add Customer
          </button>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          {customers.map((c, i) => {
            const cs = customerSales(c.id);
            const totalSpent = cs.reduce((a, s) => a + s.total, 0);
            return (
              <div key={c.id} onClick={() => openEdit(c)} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                borderBottom: i < customers.length - 1 ? '1px solid var(--border)' : 'none',
                cursor: 'pointer', transition: 'background 0.1s',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--secondary)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--muted-foreground)' }}>
                  <User size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{c.phone} · {c.motorcycle}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, fontFamily: 'var(--font-mono-face)', fontWeight: 600 }}>{fmt(totalSpent)}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{cs.length} purchases</div>
                  {c.balance > 0 && <div style={{ fontSize: 11, color: '#ef4444', fontFamily: 'var(--font-mono-face)' }}>Owes {fmt(c.balance)}</div>}
                </div>
              </div>
            );
          })}
          {customers.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted-foreground)' }}>No customers yet</div>}
        </div>
      </div>

      {/* Form panel */}
      {(isNew || selected) && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, height: 'fit-content' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{isNew ? 'New Customer' : 'Edit Customer'}</h3>
            <button onClick={() => { setIsNew(false); setSelected(null); }} style={{ background: 'none', color: 'var(--muted-foreground)' }}><X size={16} /></button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {([['Name', 'name', 'text'], ['Phone', 'phone', 'tel'], ['Motorcycle', 'motorcycle', 'text'], ['Credit Balance (₦)', 'balance', 'number']] as [string, keyof typeof form, string][]).map(([label, key, type]) => (
              <div key={key}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>{label}</label>
                <input type={type} value={form[key] as string} onChange={e => f(key, type === 'number' ? +e.target.value : e.target.value)} style={{ width: '100%' }} />
              </div>
            ))}
          </div>

          {selected && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Purchase History</div>
              {customerSales(selected.id).slice(-5).reverse().map((s, i) => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '5px 0', borderBottom: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
                  <span>{new Date(s.timestamp).toLocaleDateString('en-NG')}</span>
                  <span>{s.items.length} item(s)</span>
                  <span style={{ fontFamily: 'var(--font-mono-face)', color: 'var(--primary)' }}>{fmt(s.total)}</span>
                </div>
              ))}
              {customerSales(selected.id).length === 0 && <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>No purchases yet</div>}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={save} style={{ flex: 1, background: 'var(--primary)', color: 'var(--primary-foreground)', borderRadius: 'var(--radius)', padding: '9px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Save size={13} /> Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
