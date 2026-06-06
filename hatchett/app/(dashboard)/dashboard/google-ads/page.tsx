'use client';

import { useState, useEffect } from 'react';
import { Target, DollarSign, MousePointer, Eye, TrendingUp, Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { KPICard, KPICardSkeleton } from '@/components/dashboard/KPICard';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { ConnectIntegrationBanner } from '@/components/dashboard/ConnectIntegrationBanner';
import { useDateRange } from '@/hooks/useDateRange';
import { formatDateISO } from '@/lib/date-utils';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#242424', border: '1px solid #333', borderRadius: 8, padding: '10px 14px' }}>
      <div style={{ color: '#9CA3AF', fontSize: '0.75rem', marginBottom: 6 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color, fontSize: '0.875rem', fontWeight: 600 }}>{p.name}: {typeof p.value === 'number' ? (p.name === 'Spend' ? `$${p.value.toFixed(2)}` : p.value.toLocaleString()) : p.value}</div>
      ))}
    </div>
  );
};

const statusColors: Record<string, string> = { ENABLED: '#22C55E', PAUSED: '#EAB308', REMOVED: '#9CA3AF' };

export default function GoogleAdsPage() {
  const { dateRange, setDateRange } = useDateRange(30);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notConnected, setNotConnected] = useState(false);
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [sortField, setSortField] = useState('spend');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const stored = sessionStorage.getItem('hatchett_active_client');
    if (stored) setActiveClientId(stored);
    const handler = (e: Event) => { const cid = (e as CustomEvent).detail?.clientId; if (cid) setActiveClientId(cid); };
    window.addEventListener('clientChanged', handler);
    return () => window.removeEventListener('clientChanged', handler);
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true); setNotConnected(false);
      try {
        const params = new URLSearchParams({ startDate: formatDateISO(dateRange.from), endDate: formatDateISO(dateRange.to), ...(activeClientId ? { clientId: activeClientId } : {}) });
        const res = await fetch(`/api/analytics/google-ads?${params}`);
        const json = await res.json();
        if (json.notConnected) { setNotConnected(true); return; }
        if (res.ok) setData(json);
      } finally { setLoading(false); }
    }
    load();
  }, [dateRange, activeClientId]);

  const sortedCampaigns = data?.campaigns ? [...data.campaigns].sort((a: any, b: any) => {
    const av = a[sortField] ?? 0, bv = b[sortField] ?? 0;
    return sortDir === 'desc' ? bv - av : av - bv;
  }) : [];

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const thStyle = (field: string): React.CSSProperties => ({
    padding: '10px 12px', textAlign: 'right', fontSize: '0.7rem', fontWeight: 700, color: sortField === field ? '#FF4500' : '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #333', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ margin: 0, color: '#F5F5F5', fontWeight: 700 }}>Google Ads</h2>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {notConnected && <ConnectIntegrationBanner integration="Google Ads" description="Add your Google Ads Customer ID in client settings." />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
        {loading ? Array.from({ length: 8 }).map((_, i) => <KPICardSkeleton key={i} />) : data ? (
          <>
            <KPICard title="Total Spend" value={data.totalSpend} previousValue={data.previousTotalSpend} format="currency" icon={DollarSign} />
            <KPICard title="Impressions" value={data.impressions} previousValue={data.previousImpressions} format="number" icon={Eye} />
            <KPICard title="Clicks" value={data.clicks} previousValue={data.previousClicks} format="number" icon={MousePointer} />
            <KPICard title="CTR" value={data.ctr} previousValue={data.previousCtr} format="percent" icon={TrendingUp} />
            <KPICard title="Avg CPC" value={data.cpc} previousValue={data.previousCpc} format="currency" icon={DollarSign} invertDelta />
            <KPICard title="Conversions" value={data.conversions} previousValue={data.previousConversions} format="number" icon={Target} />
            <KPICard title="CPA" value={data.cpa} previousValue={data.previousCpa} format="currency" icon={DollarSign} invertDelta />
            <KPICard title="ROAS" value={data.roas.toFixed(2)} previousValue={data.previousRoas} format="text" icon={TrendingUp} />
          </>
        ) : null}
      </div>

      {!loading && data && (
        <>
          {/* Spend Chart */}
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

          {/* Campaign Table */}
          <div style={{ background: '#242424', border: '1px solid #333', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #333' }}>
              <h3 style={{ margin: 0, color: '#F5F5F5', fontSize: '1rem', fontWeight: 600 }}>Campaigns ({data.campaigns.length})</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle('name'), textAlign: 'left' }}>Campaign</th>
                    <th style={thStyle('status')}>Status</th>
                    {['spend', 'impressions', 'clicks', 'ctr', 'cpc', 'conversions', 'roas'].map(f => (
                      <th key={f} style={thStyle(f)} onClick={() => toggleSort(f)}>
                        {f.toUpperCase()} {sortField === f ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedCampaigns.map((c: any) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #2A2A2A' }}
                      onMouseEnter={e => { (e.currentTarget).style.background = 'rgba(51,51,51,0.3)'; }}
                      onMouseLeave={e => { (e.currentTarget).style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '12px', fontSize: '0.875rem', color: '#F5F5F5', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <span style={{ background: `${statusColors[c.status] || '#9CA3AF'}22`, color: statusColors[c.status] || '#9CA3AF', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>{c.status}</span>
                      </td>
                      {[
                        `$${c.spend.toFixed(2)}`,
                        c.impressions.toLocaleString(),
                        c.clicks.toLocaleString(),
                        `${c.ctr.toFixed(2)}%`,
                        `$${c.cpc.toFixed(2)}`,
                        c.conversions.toFixed(0),
                        c.roas.toFixed(2),
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

      {!loading && notConnected && (
        <EmptyState icon={Target} title="Google Ads Not Connected" description="Add your Google Ads Customer ID in Client Settings to see campaign data." />
      )}
    </div>
  );
}
