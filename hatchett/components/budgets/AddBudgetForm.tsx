'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface AddBudgetFormProps {
  clientId: string;
  onAdd: (budget: any) => void;
  onClose: () => void;
}

const CHANNELS = ['Google Ads', 'Meta Ads', 'LinkedIn Ads', 'SEO', 'Content', 'Email', 'Other'];
const PERIODS = ['Monthly', 'Quarterly'];

export function AddBudgetForm({ clientId, onAdd, onClose }: AddBudgetFormProps) {
  const [channel, setChannel] = useState('Google Ads');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState('Monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const inputStyle: React.CSSProperties = { width: '100%', background: '#1A1A1A', border: '1px solid #444', borderRadius: 8, padding: '10px 14px', color: '#F5F5F5', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) { setError('Enter a valid amount'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, amount: parseFloat(amount), period, clientId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to add budget'); return; }
      onAdd(data.budget);
      onClose();
    } catch { setError('Something went wrong'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: '#242424', border: '1px solid #333', borderRadius: 12, padding: 32, width: '100%', maxWidth: 440, position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 4 }}>
          <X size={18} />
        </button>
        <h3 style={{ margin: '0 0 24px', color: '#F5F5F5', fontSize: '1.1rem', fontWeight: 700 }}>Add Budget</h3>
        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: '#EF4444', fontSize: '0.875rem', marginBottom: 16 }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: '#9CA3AF', marginBottom: 6 }}>Channel</label>
            <select value={channel} onChange={e => setChannel(e.target.value)} style={{ ...inputStyle }}>
              {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: '#9CA3AF', marginBottom: 6 }}>Budget Amount ($)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="5000" min="0" style={inputStyle}
              onFocus={e => { e.target.style.borderColor = '#FF4500'; e.target.style.boxShadow = '0 0 0 3px rgba(255,69,0,0.4)'; }}
              onBlur={e => { e.target.style.borderColor = '#444'; e.target.style.boxShadow = 'none'; }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: '#9CA3AF', marginBottom: 6 }}>Period</label>
            <select value={period} onChange={e => setPeriod(e.target.value)} style={{ ...inputStyle }}>
              {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" onClick={onClose} style={{ background: '#333', border: 'none', borderRadius: 8, padding: '10px 20px', color: '#F5F5F5', cursor: 'pointer', fontSize: '0.875rem' }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ background: 'linear-gradient(135deg, #FF4500, #FF8C00)', border: 'none', borderRadius: 8, padding: '10px 20px', color: 'white', fontWeight: 700, fontSize: '0.875rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Adding...' : 'Add Budget'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
