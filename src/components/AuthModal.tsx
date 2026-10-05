import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, UserPlus, X, Mail, Lock, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        if (data.user && !data.session) {
          setMessage('Account created! Please check your email to verify your account.');
        } else {
          setMessage('Account created successfully! You are now logged in.');
          setTimeout(() => {
            onClose();
          }, 1500);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 16
    }}>
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 12, width: '100%', maxWidth: 400, padding: 24,
        position: 'relative', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16, background: 'none',
            border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer'
          }}
        >
          <X size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', background: 'rgba(37,99,235,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)'
          }}>
            {isSignUp ? <UserPlus size={18} /> : <LogIn size={18} />}
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
              {isSignUp ? 'Create Business Account' : 'Sign In to Motolarry'}
            </h2>
            <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '2px 0 0' }}>
              {isSignUp ? 'Start managing your products & POS' : 'Access your isolated inventory & sales'}
            </p>
          </div>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 6, padding: '10px 12px', marginBottom: 16, fontSize: 13,
            color: '#ef4444', display: 'flex', alignItems: 'center', gap: 8
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div style={{
            background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: 6, padding: '10px 12px', marginBottom: 16, fontSize: 13,
            color: '#16a34a'
          }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--muted-foreground)' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 12, top: 10, color: 'var(--muted-foreground)' }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@motolarry.com"
                style={{ width: '100%', paddingLeft: 36 }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--muted-foreground)' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 12, top: 10, color: 'var(--muted-foreground)' }} />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ width: '100%', paddingLeft: 36 }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              background: 'var(--primary)', color: 'var(--primary-foreground)',
              padding: '10px 16px', borderRadius: 'var(--radius)', fontWeight: 600,
              fontSize: 14, cursor: 'pointer', marginTop: 6, display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: 8
            }}
          >
            {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'var(--muted-foreground)' }}>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setMessage(null);
            }}
            style={{
              background: 'none', border: 'none', color: 'var(--primary)',
              fontWeight: 600, cursor: 'pointer', padding: 0
            }}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
}
