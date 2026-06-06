'use client';

import { useState, useEffect, useCallback } from 'react';

interface TrackedKeyword {
  id: string;
  keyword: string;
  targetUrl: string | null;
  domain: string;
  currentRank: number | null;
  previousRank: number | null;
  bestRank: number | null;
  history: Array<{ date: string; rank: number | null }>;
}

export function useRankTracker(activeClientId: string | null) {
  const [keywords, setKeywords] = useState<TrackedKeyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKeywords = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = activeClientId ? `?clientId=${activeClientId}` : '';
      const res = await fetch(`/api/rank-tracker${params}`);
      if (!res.ok) { setError('Failed to load'); return; }
      setKeywords(await res.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [activeClientId]);

  useEffect(() => { fetchKeywords(); }, [fetchKeywords]);

  const addKeyword = async (keyword: string, domain: string, targetUrl?: string) => {
    const res = await fetch('/api/rank-tracker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword, domain, targetUrl, clientId: activeClientId }),
    });
    if (res.ok) { await fetchKeywords(); return true; }
    return false;
  };

  const deleteKeyword = async (id: string) => {
    await fetch(`/api/rank-tracker/${id}`, { method: 'DELETE' });
    await fetchKeywords();
  };

  return { keywords, loading, error, refetch: fetchKeywords, addKeyword, deleteKeyword };
}
