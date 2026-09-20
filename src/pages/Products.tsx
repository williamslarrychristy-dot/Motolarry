import { useState } from 'react';
import { Plus, Search, Edit2, ToggleLeft, ToggleRight, AlertTriangle, X, Save } from 'lucide-react';
import { uid, Product } from '../store';
import { useData } from '../DataContext';

const EMPTY: Omit<Product, 'id' | 'createdAt'> = {
  name: '', description: '', sku: '', barcode: '', category: '', subcategory: '',
  brand: '', manufacturer: '', fitment: '', costPrice: 0, salePrice: 0, msrp: 0,
  qty: 0, reorderPoint: 5, reorderQty: 10, location: '', imageUrl: '',
  aliases: '', active: true, tags: '', serialTracked: false, supplierId: '',
};

function Badge({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{ background: color ? `${color}22` : 'var(--secondary)', border: `1px solid ${color ? `${color}44` : 'var(--border)'}`, color: color || 'var(--muted-foreground)', borderRadius: 4, padding: '2px 7px', fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-mono-face)' }}>
      {children}
    </span>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '40px 20px' }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', width: '100%', maxWidth: 680 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', color: 'var(--muted-foreground)' }}><X size={18} /></button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      {children}
    </div>
  );
}

export default function Products() {
  const { products, suppliers, setProducts } = useData();
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState<Omit<Product, 'id' | 'createdAt'>>(EMPTY);

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    const matches = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
      || p.barcode.includes(q) || p.aliases.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q);
    return matches && (!filterCat || p.category === filterCat);
  });

  function openNew() { setForm(EMPTY); setIsNew(true); setEditing(null); }
  function openEdit(p: Product) { const { id, createdAt, ...rest } = p; setForm(rest); setEditing(p); setIsNew(false); }
  function save() {
    if (isNew) {
      setProducts([...products, { ...form, id: uid(), createdAt: new Date().toISOString() }]);
    } else if (editing) {
      setProducts(products.map(p => p.id === editing.id ? { ...editing, ...form } : p));
    }
    setEditing(null); setIsNew(false);
  }
  function toggleActive(id: string) {
    setProducts(products.map(p => p.id === id ? { ...p, active: !p.active } : p));
  }
  function f(k: keyof typeof form, v: string | number | boolean) { setForm(prev => ({ ...prev, [k]: v })); }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Products</h1>
          <p style={{ color: 'var(--muted-foreground)', margin: '4px 0 0', fontSize: 13 }}>{products.filter(p => p.active).length} active SKUs</p>
        </div>
        <button onClick={openNew} style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', borderRadius: 'var(--radius)', padding: '8px 16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <Plus size={15} /> Add Product
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, SKU, barcode, alias…" style={{ width: '100%', paddingLeft: 32 }} />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ minWidth: 140 }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--secondary)' }}>
              {['Product', 'SKU', 'Category', 'Brand', 'Cost', 'Price', 'Stock', 'Status', ''].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr key={p.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--secondary)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{p.fitment}</div>
                </td>
                <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono-face)', fontSize: 12, color: 'var(--muted-foreground)' }}>{p.sku}</td>
                <td style={{ padding: '10px 14px', fontSize: 12 }}>{p.category}</td>
                <td style={{ padding: '10px 14px', fontSize: 12 }}>{p.brand}</td>
                <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono-face)', fontSize: 12 }}>{new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(p.costPrice)}</td>
                <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono-face)', fontSize: 12, fontWeight: 600 }}>{new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(p.salePrice)}</td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{ fontFamily: 'var(--font-mono-face)', fontSize: 12, color: p.qty <= p.reorderPoint ? '#ef4444' : p.qty <= p.reorderPoint * 2 ? '#f59e0b' : 'var(--foreground)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {p.qty <= p.reorderPoint && <AlertTriangle size={11} />}{p.qty}
                  </span>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <Badge color={p.active ? '#22c55e' : '#6b7280'}>{p.active ? 'Active' : 'Inactive'}</Badge>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => openEdit(p)} style={{ background: 'var(--secondary)', borderRadius: 4, padding: '4px 8px', color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                      <Edit2 size={11} /> Edit
                    </button>
                    <button onClick={() => toggleActive(p.id)} style={{ background: 'none', color: 'var(--muted-foreground)', padding: '4px 6px', display: 'flex' }}>
                      {p.active ? <ToggleRight size={18} color="var(--primary)" /> : <ToggleLeft size={18} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={9} style={{ padding: 32, textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 13 }}>
                {products.length === 0 ? 'No products yet — add your first product or import from CSV' : 'No products match your search'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {(editing || isNew) && (
        <Modal title={isNew ? 'Add Product' : `Edit: ${editing?.name}`} onClose={() => { setEditing(null); setIsNew(false); }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ gridColumn: '1 / -1' }}><Field label="Product Name"><input value={form.name} onChange={e => f('name', e.target.value)} style={{ width: '100%' }} /></Field></div>
            <div style={{ gridColumn: '1 / -1' }}><Field label="Description"><textarea value={form.description} onChange={e => f('description', e.target.value)} style={{ width: '100%', minHeight: 60, resize: 'vertical' }} /></Field></div>
            <Field label="SKU"><input value={form.sku} onChange={e => f('sku', e.target.value)} /></Field>
            <Field label="Barcode"><input value={form.barcode} onChange={e => f('barcode', e.target.value)} /></Field>
            <Field label="Category"><input value={form.category} onChange={e => f('category', e.target.value)} /></Field>
            <Field label="Subcategory"><input value={form.subcategory} onChange={e => f('subcategory', e.target.value)} /></Field>
            <Field label="Brand"><input value={form.brand} onChange={e => f('brand', e.target.value)} /></Field>
            <Field label="Manufacturer"><input value={form.manufacturer} onChange={e => f('manufacturer', e.target.value)} /></Field>
            <div style={{ gridColumn: '1 / -1' }}><Field label="Fitment"><input value={form.fitment} onChange={e => f('fitment', e.target.value)} /></Field></div>
            <Field label="Cost Price (₦)"><input type="number" value={form.costPrice} onChange={e => f('costPrice', +e.target.value)} /></Field>
            <Field label="Sale Price (₦)"><input type="number" value={form.salePrice} onChange={e => f('salePrice', +e.target.value)} /></Field>
            <Field label="MSRP (₦)"><input type="number" value={form.msrp} onChange={e => f('msrp', +e.target.value)} /></Field>
            <Field label="Quantity on Hand"><input type="number" value={form.qty} onChange={e => f('qty', +e.target.value)} /></Field>
            <Field label="Reorder Point"><input type="number" value={form.reorderPoint} onChange={e => f('reorderPoint', +e.target.value)} /></Field>
            <Field label="Reorder Quantity"><input type="number" value={form.reorderQty} onChange={e => f('reorderQty', +e.target.value)} /></Field>
            <Field label="Location / Bin"><input value={form.location} onChange={e => f('location', e.target.value)} /></Field>
            <Field label="Supplier">
              <select value={form.supplierId} onChange={e => f('supplierId', e.target.value)}>
                <option value="">None</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <div style={{ gridColumn: '1 / -1' }}><Field label="Aliases (comma-separated)"><input value={form.aliases} onChange={e => f('aliases', e.target.value)} placeholder="e.g. comp chain, cb400 chain" /></Field></div>
            <div style={{ gridColumn: '1 / -1' }}><Field label="Tags (comma-separated)"><input value={form.tags} onChange={e => f('tags', e.target.value)} placeholder="e.g. fast-moving, honda-specific" /></Field></div>
            <Field label="Image URL"><input value={form.imageUrl} onChange={e => f('imageUrl', e.target.value)} /></Field>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={form.active} onChange={e => f('active', e.target.checked)} /> Active (visible in POS)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={form.serialTracked} onChange={e => f('serialTracked', e.target.checked)} /> Serial / Chassis tracking
              </label>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <button onClick={() => { setEditing(null); setIsNew(false); }} style={{ background: 'var(--secondary)', color: 'var(--foreground)', borderRadius: 'var(--radius)', padding: '8px 16px' }}>Cancel</button>
            <button onClick={save} style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', borderRadius: 'var(--radius)', padding: '8px 16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Save size={14} /> Save Product
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
