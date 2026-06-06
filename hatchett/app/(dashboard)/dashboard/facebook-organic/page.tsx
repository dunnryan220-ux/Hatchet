'use client';

import { useState, useEffect } from 'react';
import { Layers, Camera, Users, Heart, MessageCircle, TrendingUp, Eye, Share2 } from 'lucide-react';
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
          {p.name}: {Number(p.value).toLocaleString()}
        </div>
      ))}
    </div>
  );
};

export default function FacebookOrganicPage() {
  const { dateRange, setDateRange } = useDateRange(30);
  const [fbData, setFbData] = useState<any>(null);
  const [igData, setIgData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notConnected, setNotConnected] = useState(false);
  const [tokenExpired, setTokenExpired] = useState(false);
  const [activeTab, setActiveTab] = useState<'facebook' | 'instagram'>('facebook');
  const [activeClientId, setActiveClientId] = useState<string | null>(null);

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
        const res = await fetch(`/api/analytics/facebook-pages?${params}`);
        const json = await res.json();
        if (json.notConnected) { setNotConnected(true); return; }
        if (json.tokenExpired) { setTokenExpired(true); return; }
        if (res.ok) {
          setFbData(json.page);
          setIgData(json.instagram);
        }
      } finally { setLoading(false); }
    }
    load();
  }, [dateRange, activeClientId]);

  const handleConnect = () => {
    if (!activeClientId) return;
    window.location.href = `/api/connect/facebook?clientId=${activeClientId}`;
  };

  const tabStyle = (tab: string): React.CSSProperties => ({
    padding: '8px 20px',
    background: activeTab === tab ? '#FF4500' : 'transparent',
    border: activeTab === tab ? 'none' : '1px solid #333',
    borderRadius: 8,
    color: activeTab === tab ? 'white' : '#9CA3AF',
    fontWeight: 600,
    fontSize: '0.875rem',
    cursor: 'pointer',
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h2 style={{ margin: 0, color: '#F5F5F5', fontWeight: 700 }}>Social Organic</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={tabStyle('facebook')} onClick={() => setActiveTab('facebook')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Layers size={14} /> Facebook</span>
            </button>
            <button style={tabStyle('instagram')} onClick={() => setActiveTab('instagram')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Camera size={14} /> Instagram</span>
            </button>
          </div>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {tokenExpired && (
        <TokenExpiryWarning
          platform="Facebook/Instagram"
          message="Your Facebook access token has expired. Reconnect to restore data."
          onReconnect={handleConnect}
        />
      )}

      {notConnected && !tokenExpired && (
        <ConnectIntegrationBanner
          integration="Facebook / Instagram"
          description="Connect your Facebook Page and Instagram account to see organic social data."
        />
      )}

      {/* FACEBOOK TAB */}
      {activeTab === 'facebook' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
            {loading ? Array.from({ length: 6 }).map((_, i) => <KPICardSkeleton key={i} />) : fbData ? (
              <>
                <KPICard title="Page Followers" value={fbData.followers} previousValue={fbData.previousFollowers} format="number" icon={Users} />
                <KPICard title="Impressions" value={fbData.impressions} previousValue={fbData.previousImpressions} format="number" icon={Eye} />
                <KPICard title="Reach" value={fbData.reach} previousValue={fbData.previousReach} format="number" icon={TrendingUp} />
                <KPICard title="Engagement" value={fbData.engagement} previousValue={fbData.previousEngagement} format="number" icon={Heart} />
                <KPICard title="Eng. Rate" value={fbData.engagementRate} previousValue={fbData.previousEngagementRate} format="percent" icon={TrendingUp} />
                <KPICard title="Post Count" value={fbData.postCount} previousValue={fbData.previousPostCount} format="number" icon={Share2} />
              </>
            ) : null}
          </div>

          {!loading && fbData && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                <div style={{ background: '#242424', border: '1px solid #333', borderRadius: 12, padding: 24 }}>
                  <h3 style={{ margin: '0 0 20px', color: '#F5F5F5', fontSize: '1rem', fontWeight: 600 }}>Follower Growth</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={fbData.followerGrowth || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="followers" stroke="#FF4500" strokeWidth={2} dot={false} name="Followers" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ background: '#242424', border: '1px solid #333', borderRadius: 12, padding: 24 }}>
                  <h3 style={{ margin: '0 0 20px', color: '#F5F5F5', fontSize: '1rem', fontWeight: 600 }}>Impressions & Reach</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={fbData.impressionsByDate || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="impressions" fill="#FF4500" name="Impressions" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="reach" fill="#FF8C00" name="Reach" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Posts */}
              <div style={{ background: '#242424', border: '1px solid #333', borderRadius: 12, padding: 24 }}>
                <h3 style={{ margin: '0 0 16px', color: '#F5F5F5', fontSize: '1rem', fontWeight: 600 }}>Top Posts</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {(fbData.topPosts || []).map((post: any) => (
                    <div key={post.id} style={{ background: '#1A1A1A', borderRadius: 8, padding: 16, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: '0 0 8px', fontSize: '0.875rem', color: '#F5F5F5', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                          {post.message || '(No caption)'}
                        </p>
                        <div style={{ display: 'flex', gap: 16, fontSize: '0.75rem', color: '#9CA3AF' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Eye size={12} /> {Number(post.impressions || 0).toLocaleString()}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Heart size={12} /> {Number(post.likes || 0).toLocaleString()}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MessageCircle size={12} /> {Number(post.comments || 0).toLocaleString()}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Share2 size={12} /> {Number(post.shares || 0).toLocaleString()}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#9CA3AF', whiteSpace: 'nowrap' }}>{post.createdTime ? new Date(post.createdTime).toLocaleDateString() : ''}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {!loading && notConnected && !tokenExpired && (
            <EmptyState
              icon={Layers}
              title="Facebook Not Connected"
              description="Connect your Facebook Page to see organic performance data."
              action={<button onClick={handleConnect} style={{ background: 'linear-gradient(135deg, #FF4500, #FF8C00)', border: 'none', borderRadius: 8, padding: '10px 20px', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Connect Facebook</button>}
            />
          )}
        </>
      )}

      {/* INSTAGRAM TAB */}
      {activeTab === 'instagram' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
            {loading ? Array.from({ length: 6 }).map((_, i) => <KPICardSkeleton key={i} />) : igData ? (
              <>
                <KPICard title="Followers" value={igData.followers} previousValue={igData.previousFollowers} format="number" icon={Users} />
                <KPICard title="Impressions" value={igData.impressions} previousValue={igData.previousImpressions} format="number" icon={Eye} />
                <KPICard title="Reach" value={igData.reach} previousValue={igData.previousReach} format="number" icon={TrendingUp} />
                <KPICard title="Likes" value={igData.likes} previousValue={igData.previousLikes} format="number" icon={Heart} />
                <KPICard title="Comments" value={igData.comments} previousValue={igData.previousComments} format="number" icon={MessageCircle} />
                <KPICard title="Profile Views" value={igData.profileViews} previousValue={igData.previousProfileViews} format="number" icon={Eye} />
              </>
            ) : null}
          </div>

          {!loading && igData && (
            <>
              <div style={{ background: '#242424', border: '1px solid #333', borderRadius: 12, padding: 24, marginBottom: 20 }}>
                <h3 style={{ margin: '0 0 20px', color: '#F5F5F5', fontSize: '1rem', fontWeight: 600 }}>Follower Growth</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={igData.followerGrowth || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="followers" stroke="#FF8C00" strokeWidth={2} dot={false} name="Followers" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* IG Top Posts Grid */}
              <div style={{ background: '#242424', border: '1px solid #333', borderRadius: 12, padding: 24 }}>
                <h3 style={{ margin: '0 0 16px', color: '#F5F5F5', fontSize: '1rem', fontWeight: 600 }}>Top Posts</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                  {(igData.topMedia || []).map((media: any) => (
                    <div key={media.id} style={{ background: '#1A1A1A', borderRadius: 8, overflow: 'hidden' }}>
                      {media.thumbnailUrl && (
                        <div style={{ width: '100%', aspectRatio: '1', background: '#333', overflow: 'hidden' }}>
                          <img src={media.thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      )}
                      <div style={{ padding: 12 }}>
                        <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: '#F5F5F5', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                          {media.caption || '(No caption)'}
                        </p>
                        <div style={{ display: 'flex', gap: 12, fontSize: '0.75rem', color: '#9CA3AF' }}>
                          <span><Heart size={11} style={{ display: 'inline', marginRight: 3 }} />{Number(media.likeCount || 0).toLocaleString()}</span>
                          <span><MessageCircle size={11} style={{ display: 'inline', marginRight: 3 }} />{Number(media.commentsCount || 0).toLocaleString()}</span>
                          <span style={{ marginLeft: 'auto', fontSize: '0.7rem' }}>{media.mediaType}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {!loading && notConnected && !tokenExpired && (
            <EmptyState
              icon={Camera}
              title="Instagram Not Connected"
              description="Connect your Facebook Page (which manages Instagram) to see IG data."
              action={<button onClick={handleConnect} style={{ background: 'linear-gradient(135deg, #FF4500, #FF8C00)', border: 'none', borderRadius: 8, padding: '10px 20px', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Connect Facebook</button>}
            />
          )}
        </>
      )}
    </div>
  );
}
