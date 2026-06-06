'use client';

import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, Minus, Plus, Trash2, BarChart2, Search, Globe } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { EmptyState } from '@/components/dashboard/EmptyState';

interface TrackedKeyword {
  id: string;
  keyword: string;
  targetUrl: string;
  domain: string;
  currentRank: number | null;
  previousRank: number | null;
  bestRank: number | null;
  history: Array<{ date: string; rank: number | null }>;
}

const RankDelta = ({ current, previous }: { current: number | null; previous: number | null }) => {
  if (current === null || previous === null) return <span style={{ color: '#9CA3AF' }}>—</span>;
  const delta = previous - current; // positive = improved (lower rank = better)
  if (delta === 0) return <span style={{ color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 3 }}><Minus size={12} /> 0</span>;
  if (delta > 0) return <span style={{ color: '#22C55E', display: 'flex', alignItems: 'center', gap: 3 }}><TrendingUp size={12} /> +{delta}</span>;
  return <span style={{ color: '#EF4444', display: 'flex', alignItems: 'center', gap: 3 }}><TrendingDown size={12} /> {delta}</span>;
};

const RankBadge = ({ rank }: { rank: number | null }) => {
  if (rank === null) return <span style={{ color: '#9CA3AF', fontWeight: 600 }}>—</span>;
  const color = rank <= 3 ? '#FFD700' : rank <= 10 ? '#22C55E' : rank <= 20 ? '#FF8C00' : '#9CA3AF';
  return <span style={{ color, fontWeight: 700, fontSize: '1rem' }}>#{rank}</span>;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#242424', border: '1px solid #333', borderRadius: 8, padding: '10px 14px' }}>
      <div style={{ color: '#9CA3AF', fontSize: '0.75rem', marginBottom: 4 }}>{label}</div>
      <div style={{ color: '#FF4500', fontWeight: 600 }}>Rank: #{payload[0]?.value}</div>
    </div>
  );
};

export default function RankTrackerPage() {
  const [keywords, setKeywords] = useState<TrackedKeyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKeyword, setSelectedKeyword] = useState<TrackedKeyword | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [newTargetUrl, setNewTargetUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');

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

  const fetchKeywords = useCallback(async () => {
    setLoading(true);
    try {
      const params = activeClientId ? `?clientId=${activeClientId}` : '';
      const res = await fetch(`/api/rank-tracker${params}`);
      if (res.ok) {
        const data = await res.json();
        setKeywords(data);
        if (data.length > 0 && !selectedKeyword) setSelectedKeyword(data[0]);
      }
    } finally { setLoading(false); }
  }, [activeClientId]);

  useEffect(() => { fetchKeywords(); }, [fetchKeywords]);

  const handleAdd = async () => {
    if (!newKeyword.trim() || !newDomain.trim()) return;
    setAdding(true);
    try {
      const res = await fetch('/api/rank-tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: newKeyword.trim(),
          domain: newDomain.trim(),
          targetUrl: newTargetUrl.trim() || undefined,
          clientId: activeClientId,
        }),
      });
      if (res.ok) {
        setNewKeyword(''); setNewDomain(''); setNewTargetUrl('');
        setShowAddForm(false);
        fetchKeywords();
      }
    } finally { setAdding(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this keyword from tracking?')) return;
    setDeletingId(id);
    try {
      await fetch(`/api/rank-tracker/${id}`, { method: 'DELETE' });
      if (selectedKeyword?.id === id) setSelectedKeyword(null);
      fetchKeywords();
    } finally { setDeletingId(null); }
  };

  const filtered = keywords.filter(k =>
    k.keyword.toLowerCase().includes(filterText.toLowerCase()) ||
    k.domain.toLowerCase().includes(filterText.toLowerCase())
  );

  const inputStyle: React.CSSProperties = {
    background: '#1A1A1A', border: '1px solid #444', borderRadius: 8,
    padding: '8px 12px', color: '#F5F5F5', fontSize: '0.875rem', width: '100%', outline: 'none',
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ margin: 0, color: '#F5F5F5', fontWeight: 700 }}>Rank Tracker</h2>
        <button
          onClick={() => setShowAddForm(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#FF4500', border: 'none', borderRadius: 8, padding: '8px 16px', color: 'white', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
        >
          <Plus size={15} /> Add Keyword
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div style={{ background: '#242424', border: '1px solid #333', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 16px', color: '#F5F5F5', fontSize: '0.95rem', fontWeight: 600 }}>Track New Keyword</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', color: '#9CA3AF', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Keyword *</label>
              <input style={inputStyle} value={newKeyword} onChange={e => setNewKeyword(e.target.value)} placeholder="e.g. plumber near me" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', color: '#9CA3AF', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Domain *</label>
              <input style={inputStyle} value={newDomain} onChange={e => setNewDomain(e.target.value)} placeholder="e.g. example.com" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', color: '#9CA3AF', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Target URL</label>
              <input style={inputStyle} value={newTargetUrl} onChange={e => setNewTargetUrl(e.target.value)} placeholder="e.g. /services/plumbing" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleAdd} disabled={adding || !newKeyword.trim() || !newDomain.trim()}
              style={{ background: '#FF4500', border: 'none', borderRadius: 8, padding: '8px 20px', color: 'white', fontWeight: 600, cursor: adding ? 'wait' : 'pointer', opacity: !newKeyword.trim() || !newDomain.trim() ? 0.5 : 1 }}>
              {adding ? 'Adding...' : 'Add Keyword'}
            </button>
            <button onClick={() => setShowAddForm(false)}
              style={{ background: 'transparent', border: '1px solid #333', borderRadius: 8, padding: '8px 20px', color: '#9CA3AF', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search Filter */}
      {keywords.length > 0 && (
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input
            style={{ ...inputStyle, paddingLeft: 34 }}
            placeholder="Filter keywords..."
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
          />
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ background: '#242424', border: '1px solid #333', borderRadius: 8, padding: 16, height: 60, animation: 'pulse 2s infinite' }} />
          ))}
        </div>
      )}

      {!loading && keywords.length === 0 && (
        <EmptyState
          icon={TrendingUp}
          title="No Keywords Tracked"
          description="Add keywords to start tracking rankings in search results."
          action={<button onClick={() => setShowAddForm(true)} style={{ background: 'linear-gradient(135deg, #FF4500, #FF8C00)', border: 'none', borderRadius: 8, padding: '10px 20px', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Add First Keyword</button>}
        />
      )}

      {!loading && keywords.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }}>
          {/* Keyword List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(kw => (
              <div
                key={kw.id}
                onClick={() => setSelectedKeyword(kw)}
                style={{
                  background: selectedKeyword?.id === kw.id ? 'rgba(255,69,0,0.12)' : '#242424',
                  border: `1px solid ${selectedKeyword?.id === kw.id ? '#FF4500' : '#333'}`,
                  borderRadius: 8, padding: '12px 14px', cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#F5F5F5', marginBottom: 2 }}>{kw.keyword}</div>
                    <div style={{ fontSize: '0.7rem', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Globe size={10} /> {kw.domain}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <RankBadge rank={kw.currentRank} />
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(kw.id); }}
                      disabled={deletingId === kw.id}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4, borderRadius: 4 }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem' }}>
                  <RankDelta current={kw.currentRank} previous={kw.previousRank} />
                  {kw.bestRank && <span style={{ color: '#9CA3AF' }}>Best: #{kw.bestRank}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Rank History Chart */}
          <div>
            {selectedKeyword ? (
              <div style={{ background: '#242424', border: '1px solid #333', borderRadius: 12, padding: 24 }}>
                <div style={{ marginBottom: 20 }}>
                  <h3 style={{ margin: '0 0 4px', color: '#F5F5F5', fontSize: '1rem', fontWeight: 600 }}>{selectedKeyword.keyword}</h3>
                  <div style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>{selectedKeyword.domain}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                  {[
                    { label: 'Current Rank', value: selectedKeyword.currentRank ? `#${selectedKeyword.currentRank}` : 'N/A', color: selectedKeyword.currentRank && selectedKeyword.currentRank <= 10 ? '#22C55E' : '#9CA3AF' },
                    { label: 'Previous Rank', value: selectedKeyword.previousRank ? `#${selectedKeyword.previousRank}` : 'N/A', color: '#F5F5F5' },
                    { label: 'Best Rank', value: selectedKeyword.bestRank ? `#${selectedKeyword.bestRank}` : 'N/A', color: '#FFD700' },
                  ].map(stat => (
                    <div key={stat.label} style={{ background: '#1A1A1A', borderRadius: 8, padding: 16, textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: stat.color, marginBottom: 4 }}>{stat.value}</div>
                      <div style={{ fontSize: '0.7rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
                {selectedKeyword.history && selectedKeyword.history.length > 0 ? (
                  <>
                    <h4 style={{ margin: '0 0 16px', color: '#F5F5F5', fontSize: '0.875rem', fontWeight: 600 }}>Rank History (30 Days)</h4>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={[...selectedKeyword.history].reverse()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 10 }} tickLine={false} axisLine={false} />
                        <YAxis
                          reversed
                          domain={['auto', 'auto']}
                          tick={{ fill: '#9CA3AF', fontSize: 10 }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={v => `#${v}`}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="rank" stroke="#FF4500" strokeWidth={2} dot={{ fill: '#FF4500', r: 3 }} connectNulls name="Rank" />
                      </LineChart>
                    </ResponsiveContainer>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF' }}>
                    <BarChart2 size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
                    <p style={{ margin: 0, fontSize: '0.875rem' }}>No history data yet. Rankings update daily.</p>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ background: '#242424', border: '1px solid #333', borderRadius: 12, padding: 40, textAlign: 'center' }}>
                <TrendingUp size={32} style={{ color: '#9CA3AF', marginBottom: 12 }} />
                <p style={{ color: '#9CA3AF', margin: 0 }}>Select a keyword to view its rank history</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
