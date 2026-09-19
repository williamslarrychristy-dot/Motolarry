import { useState } from 'react';
import { getSettings, saveSettings, AppSettings } from '../store';
import { Save, Eye, EyeOff, Database, Shield } from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState(getSettings);
  const [saved, setSaved] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [showKey, setShowKey] = useState(false);

  function save() {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function f(k: keyof AppSettings, v: string) { setSettings(prev => ({ ...prev, [k]: v })); }

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Settings</h1>
        <p style={{ color: 'var(--muted-foreground)', margin: '4px 0 0', fontSize: 13 }}>Store configuration and database credentials</p>
      </div>

      {/* Store info */}
      <section style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 24, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>Store Information</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Store Name</label>
            <input value={settings.storeName} onChange={e => f('storeName', e.target.value)} style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Currency</label>
            <select value={settings.currency} onChange={e => f('currency', e.target.value)} style={{ width: '100%', maxWidth: 200 }}>
              <option value="NGN">NGN — Nigerian Naira (₦)</option>
              <option value="USD">USD — US Dollar ($)</option>
              <option value="GBP">GBP — British Pound (£)</option>
            </select>
          </div>
        </div>
      </section>

      {/* Admin security */}
      <section style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 24, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Shield size={15} color="var(--primary)" />
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Admin Security</h3>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Admin PIN</label>
          <div style={{ position: 'relative', maxWidth: 200 }}>
            <input
              type={showPin ? 'text' : 'password'}
              value={settings.adminPin}
              onChange={e => f('adminPin', e.target.value)}
              style={{ width: '100%', paddingRight: 36, letterSpacing: showPin ? 'normal' : 6 }}
              maxLength={8}
            />
            <button onClick={() => setShowPin(v => !v)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', color: 'var(--muted-foreground)', padding: 2 }}>
              {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--muted-foreground)' }}>Required to approve manual stock adjustments and sensitive actions.</p>
        </div>
      </section>

      {/* Database credentials */}
      <section style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Database size={15} color="var(--primary)" />
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Database & Storage Credentials</h3>
        </div>
        <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
          Provide your PostgreSQL / Supabase credentials to enable cloud sync. Data is currently stored locally in your browser. Once connected, your inventory will persist across devices and sessions.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Supabase Project URL</label>
            <input value={settings.supabaseUrl} onChange={e => f('supabaseUrl', e.target.value)} placeholder="https://xxxxxxxxxxxx.supabase.co" style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Supabase Anon / Service Key</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showKey ? 'text' : 'password'}
                value={settings.supabaseKey}
                onChange={e => f('supabaseKey', e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…"
                style={{ width: '100%', paddingRight: 36 }}
              />
              <button onClick={() => setShowKey(v => !v)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', color: 'var(--muted-foreground)', padding: 2 }}>
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Storage Bucket URL (optional)</label>
            <input value={settings.storageUrl} onChange={e => f('storageUrl', e.target.value)} placeholder="https://xxxxxxxxxxxx.supabase.co/storage/v1/object/public/products" style={{ width: '100%' }} />
          </div>
        </div>

        <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 6, fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--primary)' }}>Next step:</strong> Once you provide your Supabase URL and key above and save, connect via the Supabase button to activate full database sync — products, sales, stock movements, customers, and file storage for product images.
        </div>
      </section>

      <button onClick={save} style={{ background: saved ? '#22c55e' : 'var(--primary)', color: 'var(--primary-foreground)', borderRadius: 'var(--radius)', padding: '10px 24px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, transition: 'background 0.3s' }}>
        <Save size={14} /> {saved ? 'Saved!' : 'Save Settings'}
      </button>
    </div>
  );
}
