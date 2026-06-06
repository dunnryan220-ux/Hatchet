'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { TopNav } from '@/components/dashboard/TopNav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeClientId, setActiveClientId] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    const stored = sessionStorage.getItem('hatchett_active_client');
    if (stored) setActiveClientId(stored);
  }, []);

  const handleClientChange = (id: string) => {
    setActiveClientId(id);
    sessionStorage.setItem('hatchett_active_client', id);
    window.dispatchEvent(new CustomEvent('clientChanged', { detail: { clientId: id } }));
  };

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>Loading...</div>
      </div>
    );
  }

  if (!session) return null;

  const sidebarWidth = sidebarCollapsed ? 72 : 260;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#1A1A1A' }}>
      <Sidebar onCollapse={setSidebarCollapsed} />
      <div style={{ flex: 1, marginLeft: sidebarWidth, transition: 'margin-left 0.2s ease', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopNav activeClientId={activeClientId} onClientChange={handleClientChange} />
        <main style={{ flex: 1, padding: 24, overflow: 'auto' }}>{children}</main>
      </div>
    </div>
  );
}
