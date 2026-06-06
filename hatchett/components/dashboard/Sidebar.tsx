'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  LayoutDashboard, BarChart2, Target, MapPin, Layers, Camera,
  TrendingUp, Search, DollarSign, Users, Settings, LogOut,
  ChevronRight, Menu, X,
} from 'lucide-react';
import { HatchettLogo } from '@/components/splash/HatchettLogo';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  ownerOnly?: boolean;
}

const navSections: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'Overview',
    items: [{ label: 'Overview', href: '/dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Analytics',
    items: [
      { label: 'GA4 Analytics', href: '/dashboard/analytics', icon: BarChart2 },
      { label: 'Google Ads', href: '/dashboard/google-ads', icon: Target },
      { label: 'Google Business', href: '/dashboard/google-business', icon: MapPin },
      { label: 'Facebook Ads', href: '/dashboard/facebook-ads', icon: Layers },
      { label: 'Facebook Organic', href: '/dashboard/facebook-organic', icon: Camera },
    ],
  },
  {
    label: 'SEO',
    items: [
      { label: 'Rank Tracker', href: '/dashboard/rank-tracker', icon: TrendingUp },
      { label: 'SERP Viewer', href: '/dashboard/serp', icon: Search },
    ],
  },
  {
    label: 'Management',
    items: [
      { label: 'Budgets', href: '/dashboard/budgets', icon: DollarSign },
      { label: 'Clients', href: '/dashboard/clients', icon: Users, ownerOnly: true },
    ],
  },
  {
    label: 'Account',
    items: [{ label: 'Settings', href: '/dashboard/settings', icon: Settings }],
  },
];

interface SidebarProps {
  onCollapse?: (collapsed: boolean) => void;
}

export function Sidebar({ onCollapse }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = (session?.user as any)?.role;

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  useEffect(() => {
    onCollapse?.(collapsed);
  }, [collapsed, onCollapse]);

  const sidebarContent = (
    <div
      style={{
        width: collapsed ? 72 : 260,
        height: '100vh',
        background: '#1A1A1A',
        borderRight: '1px solid #333',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease',
        overflow: 'hidden',
        flexShrink: 0,
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 40,
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: collapsed ? '20px 16px' : '20px 20px',
          borderBottom: '1px solid #333',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          minHeight: 72,
        }}
      >
        <div style={{ flexShrink: 0 }}><HatchettLogo size="sm" /></div>
        {!collapsed && (
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.9rem', letterSpacing: '0.15em', color: '#F5F5F5' }}>
              HATCHETT
            </div>
            <div style={{ fontSize: '0.65rem', color: '#9CA3AF', marginTop: 1 }}>
              {(session?.user as any)?.agencyId ? 'Agency Dashboard' : ''}
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            marginLeft: 'auto',
            background: 'none',
            border: 'none',
            color: '#9CA3AF',
            cursor: 'pointer',
            padding: 4,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
          }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronRight
            size={16}
            style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s' }}
          />
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '12px 0' }} className="scrollbar-thin">
        {navSections.map(section => (
          <div key={section.label} style={{ marginBottom: 8 }}>
            {!collapsed && (
              <div
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  color: '#9CA3AF',
                  textTransform: 'uppercase',
                  padding: '8px 20px 4px',
                }}
              >
                {section.label}
              </div>
            )}
            {section.items.map(item => {
              if (item.ownerOnly && role !== 'OWNER') return null;

              const active = isActive(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: collapsed ? '10px 0' : '9px 20px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    textDecoration: 'none',
                    position: 'relative',
                    fontSize: '0.875rem',
                    fontWeight: active ? 600 : 400,
                    color: active ? '#FF4500' : '#9CA3AF',
                    background: active ? 'rgba(255,69,0,0.1)' : 'transparent',
                    borderLeft: active && !collapsed ? '3px solid #FF4500' : '3px solid transparent',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    if (!active) {
                      (e.currentTarget as HTMLAnchorElement).style.color = '#F5F5F5';
                      (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(51,51,51,0.5)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      (e.currentTarget as HTMLAnchorElement).style.color = '#9CA3AF';
                      (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
                    }
                  }}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon size={18} style={{ flexShrink: 0 }} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div style={{ padding: collapsed ? '12px 8px' : '12px 16px', borderTop: '1px solid #333' }}>
        {!collapsed && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: '0.8rem', color: '#F5F5F5', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {session?.user?.email}
            </div>
            <span
              style={{
                display: 'inline-block',
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: 4,
                background: role === 'OWNER' ? 'rgba(255,69,0,0.2)' : 'rgba(139,157,195,0.2)',
                color: role === 'OWNER' ? '#FF4500' : '#8B9DC3',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {role}
            </span>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            background: 'none',
            border: 'none',
            color: '#9CA3AF',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: 6,
            fontSize: '0.8rem',
            justifyContent: collapsed ? 'center' : 'flex-start',
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget).style.background = 'rgba(239,68,68,0.1)';
            (e.currentTarget).style.color = '#EF4444';
          }}
          onMouseLeave={e => {
            (e.currentTarget).style.background = 'none';
            (e.currentTarget).style.color = '#9CA3AF';
          }}
          title={collapsed ? 'Sign out' : undefined}
        >
          <LogOut size={16} />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </div>
  );

  return sidebarContent;
}
