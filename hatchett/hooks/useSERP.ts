'use client';

import { useState, useCallback } from 'react';

interface SERPResult {
  position: number;
  title: string;
  url: string;
  description: string;
  domain: string;
  displayUrl: string;
  type: 'organic' | 'featured' | 'ad' | 'local';
}

export function useSERP() {
  const [results, setResults] = useState<SERPResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async (keyword: string, device: string, database: string) => {
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
  }, []);

  return { results, loading, error, searched, search };
}
