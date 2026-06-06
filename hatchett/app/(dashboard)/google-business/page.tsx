'use client';

import { useState, useEffect } from 'react';
import { MapPin, Search, Globe, Navigation, Phone, Image, Star, Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { KPICard, KPICardSkeleton } from '@/components/dashboard/KPICard';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { useDateRange } from '@/hooks/useDateRange';
import { formatDateISO } from '@/lib/date-utils';

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

export default function GoogleBusinessPage() {
  const { dateRange, setDateRange } = useDateRange(30);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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
      setLoading(true); setNotConnected(false);
      try {
        const params = new URLSearchParams({ startDate: formatDateISO(dateRange.from), endDate: formatDateISO(dateRange.to), ...(activeClientId ? { clientId: activeClientId } : {}) });
        const res = await fetch(`/api/analytics/gbp?${params}`);
        const json = await res.json();
        if (json.notConnected) { setNotConnected(true); return; }
        if (res.ok) setData(json);
      } finally { setLoading(false); }
    }
    load();
  }, [dateRange, activeClientId]);

  const handleConnect = () => {
    if (!activeClientId) return;
    window.location.href = `/api/connect/gbp?clientId=${activeClientId}`;
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ margin: 0, color: '#F5F5F5', fontWeight: 700 }}>Google Business Profile</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {notConnected && (
            <button onClick={handleConnect} style={{ background: 'linear-gradient(135deg, #FF4500, #FF8C00)', border: 'none', borderRadius: 8, padding: '8px 16px', color: 'white', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
              Connect GBP
            </button>
          )}
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
        {loading ? Array.from({ length: 6 }).map((_, i) => <KPICardSkeleton key={i} />) : data ? (
          <>
            <KPICard title="Business Searches" value={data.businessSearches} previousValue={data.previousBusinessSearches} format="number" icon={Search} />
            <KPICard title="Maps Impressions" value={data.mapsImpressions} previousValue={data.previousMapsImpressions} format="number" icon={MapPin} />
            <KPICard title="Website Clicks" value={data.websiteClicks} previousValue={data.previousWebsiteClicks} format="number" icon={Globe} />
            <KPICard title="Direction Requests" value={data.directionRequests} previousValue={data.previousDirectionRequests} format="number" icon={Navigation} />
            <KPICard title="Phone Calls" value={data.phoneCalls} previousValue={data.previousPhoneCalls} format="number" icon={Phone} />
            <KPICard title="Photo Views" value={data.photoViews} previousValue={data.previousPhotoViews} format="number" icon={Image} />
          </>
        ) : null}
      </div>

      {!loading && data && (
        <>
          {/* Trend Chart */}
          <div style={{ background: '#242424', border: '1px solid #333', borderRadius: 12, padding: 24, marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 20px', color: '#F5F5F5', fontSize: '1rem', fontWeight: 600 }}>Metrics Over Time</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.metricsByDate}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="businessSearches" stroke="#FF4500" strokeWidth={2} dot={false} name="Searches" />
                <Line type="monotone" dataKey="mapsImpressions" stroke="#FF8C00" strokeWidth={2} dot={false} name="Maps" />
                <Line type="monotone" dataKey="websiteClicks" stroke="#FFD700" strokeWidth={2} dot={false} name="Website Clicks" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            {/* Search Type Breakdown */}
            <div style={{ background: '#242424', border: '1px solid #333', borderRadius: 12, padding: 24 }}>
              <h3 style={{ margin: '0 0 20px', color: '#F5F5F5', fontSize: '1rem', fontWeight: 600 }}>Search Type Breakdown</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.searchTypeBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="type" tick={{ fill: '#9CA3AF', fontSize: 11 }} tickLine={false} axisLine={false} width={70} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#FF4500" radius={4} name="Searches" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Review Summary */}
            <div style={{ background: '#242424', border: '1px solid #333', borderRadius: 12, padding: 24 }}>
              <h3 style={{ margin: '0 0 16px', color: '#F5F5F5', fontSize: '1rem', fontWeight: 600 }}>Reviews</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <div style={{ fontSize: '3rem', fontWeight: 800, color: '#F5F5F5', lineHeight: 1 }}>{data.averageRating.toFixed(1)}</div>
                <div>
                  <div style={{ display: 'flex', gap: 2, marginBottom: 4 }}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} size={16} style={{ fill: s <= Math.round(data.averageRating) ? '#FFD700' : 'none', stroke: s <= Math.round(data.averageRating) ? '#FFD700' : '#555' }} />
                    ))}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{data.totalReviews} reviews</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(data.reviews || []).slice(0, 3).map((r: any) => (
                  <div key={r.reviewId} style={{ background: '#1A1A1A', borderRadius: 8, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#F5F5F5' }}>{r.reviewer}</span>
                      <div style={{ display: 'flex', gap: 1 }}>
                        {[1, 2, 3, 4, 5].map(s => <Star key={s} size={10} style={{ fill: s <= r.starRating ? '#FFD700' : 'none', stroke: s <= r.starRating ? '#FFD700' : '#555' }} />)}
                      </div>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#9CA3AF', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{r.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {!loading && notConnected && (
        <EmptyState icon={MapPin} title="Google Business Profile Not Connected"
          description="Connect your Google Business Profile to see local search performance data."
          action={<button onClick={handleConnect} style={{ background: 'linear-gradient(135deg, #FF4500, #FF8C00)', border: 'none', borderRadius: 8, padding: '10px 20px', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Connect Now</button>}
        />
      )}
    </div>
  );
}
