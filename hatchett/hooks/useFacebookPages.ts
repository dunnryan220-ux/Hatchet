'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatDateISO } from '@/lib/date-utils';

interface DateRange { from: Date; to: Date; }

export function useFacebookPages(dateRange: DateRange, activeClientId: string | null) {
  const [fbData, setFbData] = useState<any>(null);
  const [igData, setIgData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notConnected, setNotConnected] = useState(false);
  const [tokenExpired, setTokenExpired] = useState(false);

  const fetch_ = useCallback(async () => {
    setLoading(true); setError(null); setNotConnected(false); setTokenExpired(false);
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
      if (!res.ok) { setError(json.error || 'Failed to load'); return; }
      setFbData(json.page);
      setIgData(json.instagram);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [dateRange.from, dateRange.to, activeClientId]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { fbData, igData, loading, error, notConnected, tokenExpired, refetch: fetch_ };
}
