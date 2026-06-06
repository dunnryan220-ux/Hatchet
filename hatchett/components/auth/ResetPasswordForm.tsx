'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { HatchettLogo } from '@/components/splash/HatchettLogo';

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#1A1A1A',
    border: '1px solid #444',
    borderRadius: 8,
    padding: '10px 14px',
    color: '#F5F5F5',
    fontSize: '0.875rem',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push('/login'), 2000);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to reset password');
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
        <div style={{ fontSize: '0.875rem', color: '#9CA3AF', marginTop: 4 }}>Set new password</div>
      </div>

      {success ? (
        <div style={{ textAlign: 'center', color: '#22C55E' }}>
          Password reset successful! Redirecting to login...
        </div>
      ) : (
        <>
          {!token && (
            <div style={{ color: '#EF4444', marginBottom: 16, fontSize: '0.875rem' }}>
              Invalid or expired reset link. <Link href="/forgot-password" style={{ color: '#FF8C00' }}>Request a new one</Link>.
            </div>
          )}
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '12px 16px', color: '#EF4444', fontSize: '0.875rem', marginBottom: 16 }}>{error}</div>
          )}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: '#9CA3AF', marginBottom: 6 }}>New Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required style={{ ...inputStyle, paddingRight: 40 }}
                  onFocus={e => { e.target.style.borderColor = '#FF4500'; e.target.style.boxShadow = '0 0 0 3px rgba(255,69,0,0.4)'; }}
                  onBlur={e => { e.target.style.borderColor = '#444'; e.target.style.boxShadow = 'none'; }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: '#9CA3AF', marginBottom: 6 }}>Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required style={inputStyle}
                onFocus={e => { e.target.style.borderColor = '#FF4500'; e.target.style.boxShadow = '0 0 0 3px rgba(255,69,0,0.4)'; }}
                onBlur={e => { e.target.style.borderColor = '#444'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
            <button type="submit" disabled={loading || !token} style={{ width: '100%', background: 'linear-gradient(135deg, #FF4500, #FF8C00)', border: 'none', borderRadius: 8, padding: '11px 24px', color: 'white', fontWeight: 700, fontSize: '0.875rem', cursor: (loading || !token) ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
