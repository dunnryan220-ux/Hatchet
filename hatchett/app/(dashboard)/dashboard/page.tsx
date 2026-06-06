'use client';

import { useState, useEffect } from 'react';
import { BarChart2, Target, MapPin, Layers, DollarSign, TrendingUp, Download } from 'lucide-react';
import { KPICard, KPICardSkeleton } from '@/components/dashboard/KPICard';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import { useDateRange } from '@/hooks/useDateRange';
import { formatDateISO } from '@/lib/date-utils';

interface OverviewData {
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  previousTotalSpend?: number;
  previousTotalImpressions?: number;
  previousTotalClicks?: number;
  previousTotalConversions?: number;
  budgetUtilization: number;
  activeKeywords: number;
}

export default function DashboardPage() {
  const { dateRange, setDateRange } = useDateRange(30);
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeClientId, setActiveClientId] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('hatchett_active_client');
    if (stored) setActiveClientId(stored);

    const handler = (e: Event) => {
      const clientId = (e as CustomEvent).detail?.clientId;
      if (clientId) setActiveClientId(clientId);
    };
    window.addEventListener('clientChanged', handler);
    return () => window.removeEventListener('clientChanged', handler);
  }, []);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          startDate: formatDateISO(dateRange.from),
          endDate: formatDateISO(dateRange.to),
          ...(activeClientId ? { clientId: activeClientId } : {}),
        });

        const [budgetsRes] = await Promise.allSettled([
          fetch(`/api/budgets?${params}`).then(r => r.json()),
        ]);

        const budgets = budgetsRes.status === 'fulfilled' ? budgetsRes.value.budgets || [] : [];
        const totalBudget = budgets.reduce((s: number, b: any) => s + b.amount, 0);
        const totalSpent = budgets.reduce((s: number, b: any) => s + b.spentAmount, 0);

        setData({
          totalSpend: totalSpent,
          totalImpressions: 0,
          totalClicks: 0,
          totalConversions: 0,
          budgetUtilization: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
          activeKeywords: 0,
        });
      } catch (err) {
        console.error('Overview load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [dateRange, activeClientId]);

  const handleExport = async () => {
    if (!activeClientId) return;
    try {
      const res = await fetch('/api/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: activeClientId,
          modules: ['overview', 'budgets'],
          dateRange: { from: formatDateISO(dateRange.from), to: formatDateISO(dateRange.to) },
        }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'hatchett-report.pdf';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#F5F5F5' }}>Dashboard Overview</h2>
          <p style={{ margin: '4px 0 0', color: '#9CA3AF', fontSize: '0.875rem' }}>All your marketing channels at a glance</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <button onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg, #FF4500, #FF8C00)', border: 'none', borderRadius: 8, padding: '8px 14px', color: 'white', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
            <Download size={15} />
            Export PDF
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <KPICardSkeleton key={i} />)
        ) : (
          <>
            <KPICard title="Total Ad Spend" value={data?.totalSpend || 0} previousValue={data?.previousTotalSpend} format="currency" icon={DollarSign} />
            <KPICard title="Total Impressions" value={data?.totalImpressions || 0} previousValue={data?.previousTotalImpressions} format="number" icon={BarChart2} />
            <KPICard title="Total Clicks" value={data?.totalClicks || 0} previousValue={data?.previousTotalClicks} format="number" icon={Target} />
            <KPICard title="Total Conversions" value={data?.totalConversions || 0} previousValue={data?.previousTotalConversions} format="number" icon={Layers} />
            <KPICard title="Budget Utilization" value={data?.budgetUtilization || 0} format="percent" icon={MapPin} />
            <KPICard title="Tracked Keywords" value={data?.activeKeywords || 0} format="number" icon={TrendingUp} />
          </>
        )}
      </div>

      {/* Quick Links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {[
          { title: 'GA4 Analytics', desc: 'Sessions, users, conversions', href: '/dashboard/analytics', icon: BarChart2, color: '#FF4500' },
          { title: 'Google Ads', desc: 'Campaign spend and ROAS', href: '/dashboard/google-ads', icon: Target, color: '#FF8C00' },
          { title: 'Google Business', desc: 'Local search performance', href: '/dashboard/google-business', icon: MapPin, color: '#FFD700' },
          { title: 'Facebook Ads', desc: 'Meta campaign metrics', href: '/dashboard/facebook-ads', icon: Layers, color: '#8B9DC3' },
          { title: 'Rank Tracker', desc: 'Keyword position monitoring', href: '/dashboard/rank-tracker', icon: TrendingUp, color: '#22C55E' },
          { title: 'Budget Manager', desc: 'Track spend across channels', href: '/dashboard/budgets', icon: DollarSign, color: '#FF6B35' },
        ].map(card => {
          const Icon = card.icon;
          return (
            <a key={card.href} href={card.href} style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#242424', border: '1px solid #333', borderRadius: 12, padding: '20px 24px', textDecoration: 'none', transition: 'border-color 0.15s, transform 0.1s' }}
              onMouseEnter={e => { (e.currentTarget).style.borderColor = card.color; (e.currentTarget).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { (e.currentTarget).style.borderColor = '#333'; (e.currentTarget).style.transform = 'none'; }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 10, background: `${card.color}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={22} color={card.color} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#F5F5F5', fontSize: '0.9rem' }}>{card.title}</div>
                <div style={{ color: '#9CA3AF', fontSize: '0.8rem', marginTop: 2 }}>{card.desc}</div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
