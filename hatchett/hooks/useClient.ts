'use client';

import { useState, useEffect } from 'react';

export function useActiveClient() {
  const [activeClientId, setActiveClientId] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('hatchett_active_client');
    if (stored) setActiveClientId(stored);
  }, []);

  const updateActiveClient = (id: string | null) => {
    setActiveClientId(id);
    if (id) sessionStorage.setItem('hatchett_active_client', id);
    else sessionStorage.removeItem('hatchett_active_client');
  };

  return { activeClientId, setActiveClientId: updateActiveClient };
}
