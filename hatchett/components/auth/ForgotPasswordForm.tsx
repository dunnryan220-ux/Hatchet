'use client';

import { useState } from 'react';
import Link from 'next/link';
import { HatchettLogo } from '@/components/splash/HatchettLogo';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setSent(true);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to send reset email');
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#242424', border: '1px solid #333', borderRadius: 16, padding: 40, width: '100%', maxWidth: 420 }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <HatchettLogo size="sm" />
        <div style={{ marginTop: 8, fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.2em', color: '#F5F5F5' }}>HATCHETT</div>
        <div style={{ fontSize: '0.875rem', color: '#9CA3AF', marginTop: 4 }}>Reset your password</div>
      </div>

      {sent ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#22C55E', fontSize: '2rem', marginBottom: 16 }}>✓</div>
          <p style={{ color: '#F5F5F5', marginBottom: 8 }}>Check your email</p>
          <p style={{ color: '#9CA3AF', fontSize: '0.875rem', marginBottom: 24 }}>
            We sent a password reset link to {email}
          </p>
          <Link href="/login" style={{ color: '#FF8C00', textDecoration: 'none', fontSize: '0.875rem' }}>
            Back to sign in
          </Link>
        </div>
      ) : (
        <>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '12px 16px', color: '#EF4444', fontSize: '0.875rem', marginBottom: 16 }}>
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: '#9CA3AF', marginBottom: 6 }}>Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com"
                style={{ width: '100%', background: '#1A1A1A', border: '1px solid #444', borderRadius: 8, padding: '10px 14px', color: '#F5F5F5', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => { e.target.style.borderColor = '#FF4500'; e.target.style.boxShadow = '0 0 0 3px rgba(255,69,0,0.4)'; }}
                onBlur={e => { e.target.style.borderColor = '#444'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
            <button type="submit" disabled={loading} style={{ width: '100%', background: 'linear-gradient(135deg, #FF4500, #FF8C00)', border: 'none', borderRadius: 8, padding: '11px 24px', color: 'white', fontWeight: 700, fontSize: '0.875rem', cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Link href="/login" style={{ color: '#FF8C00', textDecoration: 'none', fontSize: '0.875rem' }}>
              Back to sign in
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
