'use client';

import { useState, useEffect } from 'react';
import { BarChart2, Users, UserCheck, Target, Clock, TrendingUp, DollarSign, Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { KPICard, KPICardSkeleton } from '@/components/dashboard/KPICard';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { ConnectIntegrationBanner } from '@/components/dashboard/ConnectIntegrationBanner';
import { LoadingSkeleton } from '@/components/dashboard/LoadingSkeleton';
import { useDateRange } from '@/hooks/useDateRange';
import { formatDateISO } from '@/lib/date-utils';
import { formatDuration } from '@/lib/utils';

const CHART_COLORS = ['#FF4500', '#FF8C00', '#FFD700', '#8B9DC3', '#22C55E', '#EAB308'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#242424', border: '1px solid #333', borderRadius: 8, padding: '10px 14px' }}>
      <div style={{ color: '#9CA3AF', fontSize: '0.75rem', marginBottom: 6 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color, fontSize: '0.875rem', fontWeight: 600 }}>{p.name}: {p.value?.toLocaleString()}</div>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const { dateRange, setDateRange } = useDateRange(30);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notConnected, setNotConnected] = useState(false);
  const [activeClientId, setActiveClientId] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('hatchett_active_client');
    if (stored) setActiveClientId(stored);
    const handler = (e: Event) => { const cid = (e as CustomEvent).detail?.clientId; if (cid) setActiveClientId(cid); };
    window.addEventListener('clientChanged', handler);
    return () => window.removeEventListener('clientChanged', handler);
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true); setError(null); setNotConnected(false);
      try {
        const params = new URLSearchParams({
          startDate: formatDateISO(dateRange.from),
          endDate: formatDateISO(dateRange.to),
          ...(activeClientId ? { clientId: activeClientId } : {}),
        });
        const res = await fetch(`/api/analytics/ga4?${params}`);
        const json = await res.json();
        if (json.notConnected) { setNotConnected(true); return; }
        if (!res.ok) { setError(json.error || 'Failed to load'); return; }
        setData(json);
      } catch (e: any) { setError(e.message); }
      finally { setLoading(false); }
    }
    load();
  }, [dateRange, activeClientId]);

  const handleExport = async () => {
    if (!activeClientId) return;
    const res = await fetch('/api/reports/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: activeClientId, modules: ['analytics'], dateRange: { from: formatDateISO(dateRange.from), to: formatDateISO(dateRange.to) } }),
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'ga4-report.pdf'; a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ margin: 0, color: '#F5F5F5', fontWeight: 700 }}>GA4 Analytics</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <button onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#333', border: 'none', borderRadius: 8, padding: '8px 14px', color: '#F5F5F5', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
            <Download size={15} /> Export
          </button>
        </div>
      </div>

      {notConnected && (
        <ConnectIntegrationBanner integration="Google Analytics 4" description="Add your GA4 Property ID in client settings to see analytics data." />
      )}

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        {loading ? Array.from({ length: 7 }).map((_, i) => <KPICardSkeleton key={i} />) : data ? (
          <>
            <KPICard title="Sessions" value={data.sessions} previousValue={data.previousSessions} format="number" icon={BarChart2} />
            <KPICard title="Users" value={data.users} previousValue={data.previousUsers} format="number" icon={Users} />
            <KPICard title="New Users" value={data.newUsers} previousValue={data.previousNewUsers} format="number" icon={UserCheck} />
            <KPICard title="Bounce Rate" value={data.bounceRate * 100} previousValue={data.previousBounceRate * 100} format="percent" icon={TrendingUp} invertDelta />
            <KPICard title="Avg Session" value={data.avgSessionDuration} previousValue={data.previousAvgSessionDuration} format="duration" icon={Clock} />
            <KPICard title="Conversions" value={data.conversions} previousValue={data.previousConversions} format="number" icon={Target} />
            <KPICard title="Revenue" value={data.totalRevenue} previousValue={data.previousTotalRevenue} format="currency" icon={DollarSign} />
          </>
        ) : null}
      </div>

      {!loading && data && (
        <>
          {/* Sessions Chart */}
          <div style={{ background: '#242424', border: '1px solid #333', borderRadius: 12, padding: 24, marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 20px', color: '#F5F5F5', fontSize: '1rem', fontWeight: 600 }}>Sessions Over Time</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.sessionsByDate}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="sessions" stroke="#FF4500" strokeWidth={2} dot={false} name="Sessions" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            {/* Conversions Chart */}
            <div style={{ background: '#242424', border: '1px solid #333', borderRadius: 12, padding: 24 }}>
              <h3 style={{ margin: '0 0 20px', color: '#F5F5F5', fontSize: '1rem', fontWeight: 600 }}>Conversions Over Time</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.conversionsByDate}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="conversions" stroke="#FF8C00" strokeWidth={2} dot={false} name="Conversions" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Traffic Sources Pie */}
            <div style={{ background: '#242424', border: '1px solid #333', borderRadius: 12, padding: 24 }}>
              <h3 style={{ margin: '0 0 20px', color: '#F5F5F5', fontSize: '1rem', fontWeight: 600 }}>Traffic Sources</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={data.sessionsByChannel} dataKey="sessions" nameKey="channel" cx="50%" cy="50%" outerRadius={80} label={(props: any) => `${props.name} ${((props.percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                    {data.sessionsByChannel.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any, n: any) => [v.toLocaleString(), n]} contentStyle={{ background: '#242424', border: '1px solid #333' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Pages */}
          <div style={{ background: '#242424', border: '1px solid #333', borderRadius: 12, padding: 24 }}>
            <h3 style={{ margin: '0 0 16px', color: '#F5F5F5', fontSize: '1rem', fontWeight: 600 }}>Top Pages</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Page', 'Pageviews', 'Sessions'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Page' ? 'left' : 'right', fontSize: '0.7rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #333' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.topPages.map((p: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid #2A2A2A' }}>
                    <td style={{ padding: '10px 12px', fontSize: '0.875rem', color: '#F5F5F5', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.page}</td>
                    <td style={{ padding: '10px 12px', fontSize: '0.875rem', color: '#9CA3AF', textAlign: 'right' }}>{p.pageviews.toLocaleString()}</td>
                    <td style={{ padding: '10px 12px', fontSize: '0.875rem', color: '#9CA3AF', textAlign: 'right' }}>{p.sessions.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!loading && notConnected && (
        <EmptyState icon={BarChart2} title="GA4 Not Connected" description="Add your GA4 Property ID in Client Settings to see analytics data." />
      )}
    </div>
  );
}
