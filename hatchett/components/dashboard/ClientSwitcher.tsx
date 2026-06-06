'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Building2 } from 'lucide-react';

interface Client { id: string; name: string; website?: string; }

interface ClientSwitcherProps {
  activeClientId: string | null;
  onClientChange: (id: string) => void;
}

export function ClientSwitcher({ activeClientId, onClientChange }: ClientSwitcherProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  const activeClient = clients.find(c => c.id === activeClientId);

  useEffect(() => {
    fetch('/api/clients').then(r => r.json()).then(data => {
      setClients(data.clients || []);
      if (!activeClientId && data.clients?.[0]) onClientChange(data.clients[0].id);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#242424', border: '1px solid #333', borderRadius: 8, padding: '7px 12px', color: '#F5F5F5', cursor: 'pointer', fontSize: '0.875rem', minWidth: 160, maxWidth: 220 }}
        onMouseEnter={e => { (e.currentTarget).style.borderColor = '#FF4500'; }}
        onMouseLeave={e => { (e.currentTarget).style.borderColor = '#333'; }}
      >
        <Building2 size={15} style={{ color: '#FF4500', flexShrink: 0 }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>
          {loading ? 'Loading...' : (activeClient?.name || 'Select Client')}
        </span>
        <ChevronDown size={14} style={{ color: '#9CA3AF', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#242424', border: '1px solid #333', borderRadius: 8, zIndex: 50, overflow: 'hidden', minWidth: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
          {clients.map(c => (
            <button key={c.id} onClick={() => { onClientChange(c.id); setOpen(false); }}
              style={{ display: 'block', width: '100%', padding: '9px 14px', background: c.id === activeClientId ? 'rgba(255,69,0,0.1)' : 'transparent', border: 'none', textAlign: 'left', color: c.id === activeClientId ? '#FF4500' : '#F5F5F5', cursor: 'pointer', fontSize: '0.875rem' }}
              onMouseEnter={e => { if (c.id !== activeClientId) (e.currentTarget).style.background = 'rgba(51,51,51,0.8)'; }}
              onMouseLeave={e => { if (c.id !== activeClientId) (e.currentTarget).style.background = 'transparent'; }}
            >
              <div style={{ fontWeight: 500 }}>{c.name}</div>
              {c.website && <div style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>{c.website}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
