'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { HatchettLogo } from '@/components/splash/HatchettLogo';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    await signIn('google', { callbackUrl: '/dashboard' });
  };

  return (
    <div
      style={{
        background: '#242424',
        border: '1px solid #333',
        borderRadius: 16,
        padding: 40,
        width: '100%',
        maxWidth: 420,
        position: 'relative',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <div
            style={{
              position: 'absolute',
              inset: -20,
              background: 'radial-gradient(circle, rgba(255,69,0,0.3) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
          <HatchettLogo size="sm" />
        </div>
        <div style={{ marginTop: 8, fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.2em', color: '#F5F5F5' }}>
          HATCHETT
        </div>
        <div style={{ fontSize: '0.875rem', color: '#9CA3AF', marginTop: 4 }}>
          Sign in to your account
        </div>
      </div>

      {error && (
        <div
          style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 8,
            padding: '12px 16px',
            color: '#EF4444',
            fontSize: '0.875rem',
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', color: '#9CA3AF', marginBottom: 6 }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            style={{
              width: '100%',
              background: '#1A1A1A',
              border: '1px solid #444',
              borderRadius: 8,
              padding: '10px 14px',
              color: '#F5F5F5',
              fontSize: '0.875rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={e => {
              e.target.style.borderColor = '#FF4500';
              e.target.style.boxShadow = '0 0 0 3px rgba(255,69,0,0.4)';
            }}
            onBlur={e => {
              e.target.style.borderColor = '#444';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', color: '#9CA3AF', marginBottom: 6 }}>
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                width: '100%',
                background: '#1A1A1A',
                border: '1px solid #444',
                borderRadius: 8,
                padding: '10px 40px 10px 14px',
                color: '#F5F5F5',
                fontSize: '0.875rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={e => {
                e.target.style.borderColor = '#FF4500';
                e.target.style.boxShadow = '0 0 0 3px rgba(255,69,0,0.4)';
              }}
              onBlur={e => {
                e.target.style.borderColor = '#444';
                e.target.style.boxShadow = 'none';
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#9CA3AF',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div style={{ textAlign: 'right', marginTop: 6 }}>
            <Link href="/forgot-password" style={{ fontSize: '0.75rem', color: '#FF8C00', textDecoration: 'none' }}>
              Forgot password?
            </Link>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #FF4500, #FF8C00)',
            border: 'none',
            borderRadius: 8,
            padding: '11px 24px',
            color: 'white',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            transition: 'filter 0.15s, transform 0.1s',
          }}
          onMouseEnter={e => { if (!loading) (e.target as HTMLButtonElement).style.filter = 'brightness(1.1)'; }}
          onMouseLeave={e => { (e.target as HTMLButtonElement).style.filter = 'brightness(1)'; }}
          onMouseDown={e => { if (!loading) (e.target as HTMLButtonElement).style.transform = 'scale(0.97)'; }}
          onMouseUp={e => { (e.target as HTMLButtonElement).style.transform = 'scale(1)'; }}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: '#333' }} />
          <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>or</span>
          <div style={{ flex: 1, height: 1, background: '#333' }} />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          style={{
            width: '100%',
            background: 'transparent',
            border: '1px solid #333',
            borderRadius: 8,
            padding: '10px 24px',
            color: '#F5F5F5',
            fontWeight: 500,
            fontSize: '0.875rem',
            cursor: googleLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget).style.background = '#333'; }}
          onMouseLeave={e => { (e.currentTarget).style.background = 'transparent'; }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          {googleLoading ? 'Connecting...' : 'Sign in with Google'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: 24, fontSize: '0.875rem', color: '#9CA3AF' }}>
        Don&apos;t have an account?{' '}
        <Link href="/register" style={{ color: '#FF8C00', textDecoration: 'none' }}>
          Register
        </Link>
      </div>
    </div>
  );
}
