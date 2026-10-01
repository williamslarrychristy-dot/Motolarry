import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, LogIn, UserPlus, AlertCircle, CheckCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        const { error: err } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (err) throw err;
        setMessage('Successfully signed in!');
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 800);
      } else {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
        });
        if (err) throw err;
        if (data.session) {
          setMessage('Account created and signed in successfully!');
          setTimeout(() => {
            onSuccess?.();
            onClose();
          }, 800);
        } else {
          setMessage('Sign up successful! Check your email to confirm registration or sign in.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An authentication error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: 12, width: '100%', maxWidth: 400, padding: 28, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {mode === 'signin' ? <LogIn size={20} color="#2563eb" /> : <UserPlus size={20} color="#2563eb" />}
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20, lineHeight: 1.5 }}>
          {mode === 'signin'
            ? 'Authenticate using your account credentials to manage inventory and sales.'
            : 'Register a new operator account for this store terminal.'}
        </p>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '10px 12px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#ef4444' }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 6, padding: '10px 12px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#22c55e' }}>
            <CheckCircle size={15} style={{ flexShrink: 0 }} />
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="user@example.com"
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: '100%' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              background: '#2563eb', color: '#ffffff',
              border: 'none', borderRadius: 8, padding: '10px 16px',
              fontWeight: 600, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: 6, opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Processing…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 12, color: '#64748b' }}>
          {mode === 'signin' ? (
            <>
              Need an account?{' '}
              <button
                type="button"
                onClick={() => { setMode('signup'); setError(null); setMessage(null); }}
                style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Sign Up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setMode('signin'); setError(null); setMessage(null); }}
                style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Sign In
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
