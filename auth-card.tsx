'use client';
import React, { useState } from 'react';
import { Zap } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { GithubIcon } from '@/components/ui/icons';

interface AuthCardProps {
  onSuccess: () => void;
}

export function AuthCard({ onSuccess }: AuthCardProps) {
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); onSuccess(); }, 1400);
  };

  const handleSocial = () => {
    setLoading(true);
    setTimeout(() => { setLoading(false); onSuccess(); }, 1000);
  };

  return (
    <div style={{
      width: 420,
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '24px 28px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
      }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Zap size={20} color="#0d1117" fill="#0d1117" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-mid)' }}>
            {mode === 'signin' ? 'Sign in to CodeSage' : 'Start optimizing code for free'}
          </p>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '24px 28px' }}>
        {/* Social buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          <button
            onClick={handleSocial}
            style={{
              width: '100%', height: 38, borderRadius: 'var(--radius-md)',
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              color: 'var(--text)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: 'var(--font-ui)', transition: 'background 0.15s',
            }}
          >
            <GithubIcon size={16} />
            Continue with GitHub
          </button>
          <button
            onClick={handleSocial}
            style={{
              width: '100%', height: 38, borderRadius: 'var(--radius-md)',
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              color: 'var(--text)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: 'var(--font-ui)', transition: 'background 0.15s',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </button>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-mid)', display: 'block', marginBottom: 6 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="alex@company.com"
              style={{
                width: '100%', height: 36, padding: '0 12px',
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', color: 'var(--text)', fontSize: 13,
                fontFamily: 'var(--font-ui)', outline: 'none',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-mid)', display: 'block', marginBottom: 6 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%', height: 36, padding: '0 12px',
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', color: 'var(--text)', fontSize: 13,
                fontFamily: 'var(--font-ui)', outline: 'none',
              }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', height: 38, marginTop: 4,
              borderRadius: 'var(--radius-md)', border: 'none',
              background: 'var(--accent)', color: '#0d1117',
              fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-ui)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: loading ? 0.8 : 1, transition: 'filter 0.15s',
            }}
          >
            {loading ? <><Spinner size={14} color="#0d1117" /><span>Signing in…</span></> : (mode === 'signin' ? 'Sign In' : 'Create Account')}
          </button>
        </form>
      </div>

      {/* Footer toggle */}
      <div style={{
        padding: '16px 28px', borderTop: '1px solid var(--border)',
        textAlign: 'center', fontSize: 12, color: 'var(--text-mid)',
      }}>
        {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
        <button
          onClick={() => setMode(m => m === 'signin' ? 'register' : 'signin')}
          style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}
        >
          {mode === 'signin' ? 'Register' : 'Sign In'}
        </button>
      </div>
    </div>
  );
}
