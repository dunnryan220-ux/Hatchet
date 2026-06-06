'use client';

import { usePathname } from 'next/navigation';
import { Bell } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { ClientSwitcher } from './ClientSwitcher';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/analytics': 'GA4 Analytics',
  '/dashboard/google-ads': 'Google Ads',
  '/dashboard/google-business': 'Google Business Profile',
  '/dashboard/facebook-ads': 'Facebook Ads',
  '/dashboard/facebook-organic': 'Facebook Organic',
  '/dashboard/rank-tracker': 'Rank Tracker',
  '/dashboard/serp': 'SERP Viewer',
  '/dashboard/budgets': 'Budget Manager',
  '/dashboard/clients': 'Clients',
  '/dashboard/settings': 'Settings',
};

interface TopNavProps {
  activeClientId: string | null;
  onClientChange: (id: string) => void;
}

export function TopNav({ activeClientId, onClientChange }: TopNavProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const pageTitle = pageTitles[pathname] || 'Dashboard';

  return (
    <div style={{ height: 64, background: '#1A1A1A', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16, position: 'sticky', top: 0, zIndex: 30 }}>
      <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F5F5F5', margin: 0, flex: 1 }}>
        {pageTitle}
      </h1>
      {role === 'OWNER' && (
        <ClientSwitcher activeClientId={activeClientId} onClientChange={onClientChange} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: role !== 'OWNER' ? 'auto' : 0 }}>
        <button style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 8, borderRadius: 6, display: 'flex', alignItems: 'center' }}
          onMouseEnter={e => { (e.currentTarget).style.color = '#F5F5F5'; (e.currentTarget).style.background = '#333'; }}
          onMouseLeave={e => { (e.currentTarget).style.color = '#9CA3AF'; (e.currentTarget).style.background = 'none'; }}
        >
          <Bell size={18} />
        </button>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #FF4500, #FF8C00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700, color: 'white', cursor: 'pointer' }}>
          {session?.user?.email?.[0]?.toUpperCase() || 'U'}
        </div>
      </div>
    </div>
  );
}
