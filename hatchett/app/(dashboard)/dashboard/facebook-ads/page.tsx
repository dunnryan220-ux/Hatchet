'use client';

import { useState, useEffect } from 'react';
import { Layers, DollarSign, MousePointer, Eye, TrendingUp, Target, Users, Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { KPICard, KPICardSkeleton } from '@/components/dashboard/KPICard';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { ConnectIntegrationBanner } from '@/components/dashboard/ConnectIntegrationBanner';
import { TokenExpiryWarning } from '@/components/dashboard/TokenExpiryWarning';
import { useDateRange } from '@/hooks/useDateRange';
import { formatDateISO } from '@/lib/date-utils';

const CHART_COLORS = ['#FF4500', '#FF8C00', '#FFD700', '#8B9DC3', '#22C55E', '#EAB308'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#242424', border: '1px solid #333', borderRadius: 8, padding: '10px 14px' }}>
      <div style={{ color: '#9CA3AF', fontSize: '0.75rem', marginBottom: 6 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color, fontSize: '0.875rem', fontWeight: 600 }}>
          {p.name}: {typeof p.value === 'number' ? (p.name.toLowerCase().includes('spend') || p.name.toLowerCase().includes('cost') ? `$${p.value.toFixed(2)}` : p.value.toLocaleString()) : p.value}
        </div>
      ))}
    </div>
  );
};

export default function FacebookAdsPage() {
  const { dateRange, setDateRange } = useDateRange(30);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notConnected, setNotConnected] = useState(false);
  const [tokenExpired, setTokenExpired] = useState(false);
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [sortField, setSortField] = useState('spend');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const stored = sessionStorage.getItem('hatchett_active_client');
    if (stored) setActiveClientId(stored);
    const handler = (e: Event) => {
      const cid = (e as CustomEvent).detail?.clientId;
      if (cid) setActiveClientId(cid);
    };
    window.addEventListener('clientChanged', handler);
    return () => window.removeEventListener('clientChanged', handler);
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true); setNotConnected(false); setTokenExpired(false);
      try {
        const params = new URLSearchParams({
          startDate: formatDateISO(dateRange.from),
          endDate: formatDateISO(dateRange.to),
          ...(activeClientId ? { clientId: activeClientId } : {}),
        });
        const res = await fetch(`/api/analytics/facebook-ads?${params}`);
        const json = await res.json();
        if (json.notConnected) { setNotConnected(true); return; }
        if (json.tokenExpired) { setTokenExpired(true); return; }
        if (res.ok) setData(json);
      } finally { setLoading(false); }
    }
    load();
  }, [dateRange, activeClientId]);

  const handleConnect = () => {
    if (!activeClientId) return;
    window.location.href = `/api/connect/facebook?clientId=${activeClientId}`;
  };

  const sortedCampaigns = data?.campaigns ? [...data.campaigns].sort((a: any, b: any) => {
    const av = a[sortField] ?? 0, bv = b[sortField] ?? 0;
    return sortDir === 'desc' ? bv - av : av - bv;
  }) : [];

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortField(field); setSortDir('desc'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ margin: 0, color: '#F5F5F5', fontWeight: 700 }}>Facebook Ads</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {notConnected && (
            <button onClick={handleConnect} style={{ background: 'linear-gradient(135deg, #FF4500, #FF8C00)', border: 'none', borderRadius: 8, padding: '8px 16px', color: 'white', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
              Connect Facebook
            </button>
          )}
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {tokenExpired && (
        <TokenExpiryWarning
          platform="Facebook"
          message="Your Facebook access token has expired. Reconnect to restore data."
          onReconnect={handleConnect}
        />
      )}

      {notConnected && !tokenExpired && (
        <ConnectIntegrationBanner
          integration="Facebook Ads"
          description="Connect your Facebook Ad Account to see campaign performance data."
        />
      )}

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
        {loading ? Array.from({ length: 8 }).map((_, i) => <KPICardSkeleton key={i} />) : data ? (
          <>
            <KPICard title="Total Spend" value={data.spend} previousValue={data.previousSpend} format="currency" icon={DollarSign} />
            <KPICard title="Impressions" value={data.impressions} previousValue={data.previousImpressions} format="number" icon={Eye} />
            <KPICard title="Clicks" value={data.clicks} previousValue={data.previousClicks} format="number" icon={MousePointer} />
            <KPICard title="CTR" value={data.ctr} previousValue={data.previousCtr} format="percent" icon={TrendingUp} />
            <KPICard title="Avg CPC" value={data.cpc} previousValue={data.previousCpc} format="currency" icon={DollarSign} invertDelta />
            <KPICard title="Conversions" value={data.conversions} previousValue={data.previousConversions} format="number" icon={Target} />
            <KPICard title="Cost/Conv" value={data.costPerConversion} previousValue={data.previousCostPerConversion} format="currency" icon={DollarSign} invertDelta />
            <KPICard title="ROAS" value={data.roas} previousValue={data.previousRoas} format="number" icon={TrendingUp} />
          </>
        ) : null}
      </div>

      {!loading && data && (
        <>
          {/* Spend Over Time */}
          <div style={{ background: '#242424', border: '1px solid #333', borderRadius: 12, padding: 24, marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 20px', color: '#F5F5F5', fontSize: '1rem', fontWeight: 600 }}>Daily Ad Spend</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.spendByDate}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="spend" stroke="#FF4500" strokeWidth={2} dot={false} name="Spend" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            {/* Placement Breakdown */}
            <div style={{ background: '#242424', border: '1px solid #333', borderRadius: 12, padding: 24 }}>
              <h3 style={{ margin: '0 0 20px', color: '#F5F5F5', fontSize: '1rem', fontWeight: 600 }}>Placement Breakdown</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={data.placementBreakdown} dataKey="spend" nameKey="placement" cx="50%" cy="50%" outerRadius={80} label={(props: any) => `${props.name} ${((props.percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                    {(data.placementBreakdown || []).map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => [`$${Number(v).toFixed(2)}`, 'Spend']} contentStyle={{ background: '#242424', border: '1px solid #333' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Age/Gender Demographics */}
            <div style={{ background: '#242424', border: '1px solid #333', borderRadius: 12, padding: 24 }}>
              <h3 style={{ margin: '0 0 20px', color: '#F5F5F5', fontSize: '1rem', fontWeight: 600 }}>Age Breakdown</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.ageGenderBreakdown || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="age" tick={{ fill: '#9CA3AF', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="male" fill="#FF4500" name="Male" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="female" fill="#FF8C00" name="Female" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Campaign Table */}
          <div style={{ background: '#242424', border: '1px solid #333', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #333' }}>
              <h3 style={{ margin: 0, color: '#F5F5F5', fontSize: '1rem', fontWeight: 600 }}>Campaigns ({data.campaigns?.length ?? 0})</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #333' }}>Campaign</th>
                    {['spend', 'impressions', 'clicks', 'ctr', 'cpc', 'conversions', 'roas'].map(f => (
                      <th key={f} onClick={() => toggleSort(f)} style={{ padding: '10px 12px', textAlign: 'right', fontSize: '0.7rem', fontWeight: 700, color: sortField === f ? '#FF4500' : '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #333', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        {f.toUpperCase()} {sortField === f ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedCampaigns.map((c: any) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #2A2A2A' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(51,51,51,0.3)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '12px', fontSize: '0.875rem', color: '#F5F5F5', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</td>
                      {[
                        `$${Number(c.spend).toFixed(2)}`,
                        Number(c.impressions).toLocaleString(),
                        Number(c.clicks).toLocaleString(),
                        `${Number(c.ctr).toFixed(2)}%`,
                        `$${Number(c.cpc).toFixed(2)}`,
                        Number(c.conversions).toFixed(0),
                        Number(c.roas).toFixed(2),
                      ].map((v, i) => (
                        <td key={i} style={{ padding: '12px', fontSize: '0.875rem', color: '#9CA3AF', textAlign: 'right' }}>{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!loading && notConnected && !tokenExpired && (
        <EmptyState
          icon={Layers}
          title="Facebook Ads Not Connected"
          description="Connect your Facebook Ad Account to see campaign performance data."
          action={<button onClick={handleConnect} style={{ background: 'linear-gradient(135deg, #FF4500, #FF8C00)', border: 'none', borderRadius: 8, padding: '10px 20px', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Connect Facebook</button>}
        />
      )}
    </div>
  );
}
