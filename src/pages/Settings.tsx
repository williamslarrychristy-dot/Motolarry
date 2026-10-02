import { useState } from 'react';
import { AppSettings } from '../store';
import { useData } from '../DataContext';
import { Save, Eye, EyeOff, Shield } from 'lucide-react';

export default function Settings() {
  const { settings, setSettings } = useData();
  const [form, setForm] = useState<AppSettings>(settings);
  const [saved, setSaved] = useState(false);
  const [showPin, setShowPin] = useState(false);

  function save() {
    setSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }
  function f(k: keyof AppSettings, v: string) { setForm(prev => ({ ...prev, [k]: v })); }

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Settings</h1>
        <p style={{ color: 'var(--muted-foreground)', margin: '4px 0 0', fontSize: 13 }}>Store configuration — saved to Supabase</p>
      </div>

      <section style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 24, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>Store Information</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Store Name</label>
            <input value={form.storeName} onChange={e => f('storeName', e.target.value)} style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Currency</label>
            <select value={form.currency} onChange={e => f('currency', e.target.value)} style={{ width: '100%', maxWidth: 200 }}>
              <option value="NGN">NGN — Nigerian Naira (₦)</option>
              <option value="USD">USD — US Dollar ($)</option>
              <option value="GBP">GBP — British Pound (£)</option>
            </select>
          </div>
        </div>
      </section>

      <section style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Shield size={15} color="var(--primary)" />
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Admin Security</h3>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Admin PIN</label>
          <div style={{ position: 'relative', maxWidth: 200 }}>
            <input type={showPin ? 'text' : 'password'} value={form.adminPin} onChange={e => f('adminPin', e.target.value)} style={{ width: '100%', paddingRight: 36, letterSpacing: showPin ? 'normal' : 6 }} maxLength={8} />
            <button onClick={() => setShowPin(v => !v)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', color: 'var(--muted-foreground)', padding: 2 }}>
              {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--muted-foreground)' }}>Required for manual stock adjustments and sensitive actions.</p>
        </div>
      </section>

      <button onClick={save} style={{ background: saved ? '#22c55e' : 'var(--primary)', color: 'var(--primary-foreground)', borderRadius: 'var(--radius)', padding: '10px 24px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, transition: 'background 0.3s' }}>
        <Save size={14} /> {saved ? 'Saved to Supabase!' : 'Save Settings'}
      </button>
    </div>
  );
}
