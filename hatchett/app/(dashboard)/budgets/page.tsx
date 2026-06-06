'use client';

import { useState, useEffect } from 'react';
import { Plus, Download } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { BudgetTable } from '@/components/budgets/BudgetTable';
import { AddBudgetForm } from '@/components/budgets/AddBudgetForm';
import { LoadingSkeleton } from '@/components/dashboard/LoadingSkeleton';

interface Budget {
  id: string;
  channel: string;
  period: string;
  amount: number;
  spentAmount: number;
  history: any[];
}

export default function BudgetsPage() {
  const { data: session } = useSession();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const isOwner = (session?.user as any)?.role === 'OWNER';

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
    loadBudgets();
  }, [activeClientId]);

  async function loadBudgets() {
    setLoading(true);
    try {
      const params = activeClientId ? `?clientId=${activeClientId}` : '';
      const res = await fetch(`/api/budgets${params}`);
      const data = await res.json();
      setBudgets(data.budgets || []);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(id: string, field: 'amount' | 'spentAmount', value: number) {
    await fetch(`/api/budgets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
    await loadBudgets();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/budgets/${id}`, { method: 'DELETE' });
    setBudgets(prev => prev.filter(b => b.id !== id));
  }

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spentAmount, 0);
  const overallPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const overallColor = overallPct >= 90 ? '#EF4444' : overallPct >= 75 ? '#EAB308' : '#22C55E';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ margin: 0, color: '#F5F5F5', fontWeight: 700 }}>Budget Manager</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          {isOwner && (
            <button onClick={() => setShowAddForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg, #FF4500, #FF8C00)', border: 'none', borderRadius: 8, padding: '8px 16px', color: 'white', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
              <Plus size={16} /> Add Budget
            </button>
          )}
        </div>
      </div>

      {/* Summary row */}
      {!loading && budgets.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total Budget', value: `$${totalBudget.toLocaleString()}`, color: '#F5F5F5' },
            { label: 'Total Spent', value: `$${totalSpent.toLocaleString()}`, color: '#F5F5F5' },
            { label: 'Remaining', value: `$${(totalBudget - totalSpent).toLocaleString()}`, color: totalBudget - totalSpent < 0 ? '#EF4444' : '#22C55E' },
            { label: 'Utilization', value: `${overallPct.toFixed(1)}%`, color: overallColor },
          ].map(stat => (
            <div key={stat.label} style={{ background: '#242424', border: '1px solid #333', borderRadius: 10, padding: '16px 20px' }}>
              <div style={{ fontSize: '0.7rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{stat.label}</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <LoadingSkeleton rows={5} height={300} />
      ) : (
        <BudgetTable budgets={budgets} isOwner={isOwner} onUpdate={handleUpdate} onDelete={handleDelete} />
      )}

      {showAddForm && activeClientId && (
        <AddBudgetForm
          clientId={activeClientId}
          onAdd={b => setBudgets(prev => [...prev, b])}
          onClose={() => setShowAddForm(false)}
        />
      )}
    </div>
  );
}
