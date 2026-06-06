'use client';

import { useState, useEffect } from 'react';
import { Search, Monitor, Smartphone, ExternalLink, Globe, TrendingUp } from 'lucide-react';
import { EmptyState } from '@/components/dashboard/EmptyState';

interface SERPResult {
  position: number;
  title: string;
  url: string;
  description: string;
  domain: string;
  displayUrl: string;
  type: 'organic' | 'featured' | 'ad' | 'local';
}

export default function SERPPage() {
  const [keyword, setKeyword] = useState('');
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [database, setDatabase] = useState('us');
  const [results, setResults] = useState<SERPResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const handleSearch = async () => {
    if (!keyword.trim()) return;
    setLoading(true); setError(null); setSearched(true);
    try {
      const params = new URLSearchParams({ keyword: keyword.trim(), device, database });
      const res = await fetch(`/api/serp?${params}`);
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Search failed'); setResults([]); return; }
      setResults(json.results || []);
    } catch (e: any) { setError(e.message); setResults([]); }
    finally { setLoading(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const typeColors: Record<string, string> = {
    featured: '#FFD700',
    ad: '#FF4500',
    local: '#22C55E',
    organic: '#8B9DC3',
  };

  const typeLabels: Record<string, string> = {
    featured: 'FEATURED',
    ad: 'AD',
    local: 'LOCAL',
    organic: 'ORGANIC',
  };

  const databases = [
    { value: 'us', label: 'United States' },
    { value: 'uk', label: 'United Kingdom' },
    { value: 'ca', label: 'Canada' },
    { value: 'au', label: 'Australia' },
  ];

  const inputStyle: React.CSSProperties = {
    background: '#1A1A1A', border: '1px solid #444', borderRadius: 8,
    padding: '10px 14px', color: '#F5F5F5', fontSize: '0.875rem', outline: 'none',
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 8px', color: '#F5F5F5', fontWeight: 700 }}>SERP Viewer</h2>
        <p style={{ margin: 0, color: '#9CA3AF', fontSize: '0.875rem' }}>View live search engine results for any keyword</p>
      </div>

      {/* Search Controls */}
      <div style={{ background: '#242424', border: '1px solid #333', borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <label style={{ display: 'block', fontSize: '0.7rem', color: '#9CA3AF', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase' }}>Keyword</label>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input
                style={{ ...inputStyle, width: '100%', paddingLeft: 34, boxSizing: 'border-box' }}
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter keyword to search..."
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', color: '#9CA3AF', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase' }}>Database</label>
            <select
              style={{ ...inputStyle, cursor: 'pointer' }}
              value={database}
              onChange={e => setDatabase(e.target.value)}
            >
              {databases.map(db => <option key={db.value} value={db.value}>{db.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', color: '#9CA3AF', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase' }}>Device</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['desktop', 'mobile'] as const).map(d => (
                <button
                  key={d}
                  onClick={() => setDevice(d)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px',
                    background: device === d ? '#FF4500' : '#1A1A1A',
                    border: `1px solid ${device === d ? '#FF4500' : '#444'}`,
                    borderRadius: 8, color: device === d ? 'white' : '#9CA3AF',
                    fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
                  }}
                >
                  {d === 'desktop' ? <Monitor size={14} /> : <Smartphone size={14} />}
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleSearch}
            disabled={loading || !keyword.trim()}
            style={{
              background: 'linear-gradient(135deg, #FF4500, #FF8C00)', border: 'none', borderRadius: 8,
              padding: '10px 24px', color: 'white', fontWeight: 700, fontSize: '0.875rem',
              cursor: loading || !keyword.trim() ? 'not-allowed' : 'pointer',
              opacity: !keyword.trim() ? 0.5 : 1, whiteSpace: 'nowrap',
            }}
          >
            {loading ? 'Searching...' : 'Search SERP'}
          </button>
        </div>
      </div>

      {/* Results */}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '12px 16px', color: '#EF4444', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ background: '#242424', border: '1px solid #333', borderRadius: 10, padding: 20, opacity: 0.6 }}>
              <div style={{ height: 14, background: '#333', borderRadius: 4, width: '60%', marginBottom: 8 }} />
              <div style={{ height: 12, background: '#333', borderRadius: 4, width: '40%', marginBottom: 8 }} />
              <div style={{ height: 10, background: '#333', borderRadius: 4, width: '80%' }} />
            </div>
          ))}
        </div>
      )}

      {!loading && searched && results.length === 0 && !error && (
        <EmptyState icon={Search} title="No Results Found" description={`No SERP results found for "${keyword}". Try a different keyword or database.`} />
      )}

      {!loading && !searched && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9CA3AF' }}>
          <Search size={40} style={{ marginBottom: 16, opacity: 0.4 }} />
          <p style={{ margin: 0, fontSize: '1rem' }}>Enter a keyword above to view SERP results</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div>
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#9CA3AF' }}>
              <span style={{ color: '#F5F5F5', fontWeight: 600 }}>{results.length}</span> results for{' '}
              <span style={{ color: '#FF4500', fontWeight: 600 }}>"{keyword}"</span>
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.75rem' }}>
              {Object.entries(typeLabels).map(([key, label]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: typeColors[key] }} />
                  <span style={{ color: '#9CA3AF' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {results.map((result, idx) => (
              <div key={idx} style={{
                background: '#242424',
                border: `1px solid ${result.type === 'featured' ? 'rgba(255,215,0,0.3)' : result.type === 'ad' ? 'rgba(255,69,0,0.3)' : '#333'}`,
                borderRadius: 10, padding: 20,
                transition: 'border-color 0.15s',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ background: '#1A1A1A', color: '#9CA3AF', fontWeight: 700, fontSize: '0.7rem', padding: '2px 6px', borderRadius: 4, minWidth: 20, textAlign: 'center' }}>
                        {result.position}
                      </span>
                      <span style={{ background: `${typeColors[result.type]}22`, color: typeColors[result.type], fontSize: '0.6rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4, letterSpacing: '0.05em' }}>
                        {typeLabels[result.type]}
                      </span>
                    </div>
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#8B9DC3', fontSize: '1rem', fontWeight: 600, textDecoration: 'none', lineHeight: 1.3, display: 'block', marginBottom: 4 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#FF4500'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#8B9DC3'; }}
                    >
                      {result.title}
                    </a>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <Globe size={11} style={{ color: '#9CA3AF' }} />
                      <span style={{ fontSize: '0.75rem', color: '#22C55E' }}>{result.displayUrl || result.url}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#9CA3AF', lineHeight: 1.5 }}>{result.description}</p>
                  </div>
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#9CA3AF', flexShrink: 0, padding: 4, borderRadius: 4 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#FF4500'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#9CA3AF'; }}
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
