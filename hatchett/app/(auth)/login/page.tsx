'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { HatchettSplash } from '@/components/splash/HatchettSplash';
import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(false);
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    if (session?.user) {
      router.push('/dashboard');
      return;
    }

    const seen = sessionStorage.getItem('hatchett_splash_seen');
    if (!seen) {
      setShowSplash(true);
    } else {
      setSplashDone(true);
    }
  }, [session, router]);

  const handleSplashComplete = () => {
    setShowSplash(false);
    setSplashDone(true);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#1A1A1A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      {showSplash && <HatchettSplash onComplete={handleSplashComplete} />}
      {splashDone && (
        <div style={{ animation: 'fade-in 0.4s ease-out' }}>
          <LoginForm />
        </div>
      )}
    </div>
  );
}
