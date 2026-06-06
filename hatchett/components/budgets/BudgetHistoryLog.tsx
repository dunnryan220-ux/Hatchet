'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface BudgetHistoryEntry {
  id: string;
  changedBy: string;
  oldAmount: number;
  newAmount: number;
  changedAt: string | Date;
}

interface BudgetHistoryLogProps {
  history: BudgetHistoryEntry[];
}

export function BudgetHistoryLog({ history }: BudgetHistoryLogProps) {
  const [expanded, setExpanded] = useState(false);

  if (!history || history.length === 0) return null;

  return (
    <div style={{ marginTop: 8 }}>
      <button onClick={() => setExpanded(!expanded)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}>
        <ChevronDown size={12} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
        {history.length} change{history.length !== 1 ? 's' : ''}
      </button>
      {expanded && (
        <div style={{ marginTop: 8, paddingLeft: 16, borderLeft: '2px solid #333' }}>
          {[...history].sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()).map(entry => (
            <div key={entry.id} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: '0.75rem', color: '#F5F5F5' }}>
                {formatCurrency(entry.oldAmount)} → <span style={{ color: '#FF4500' }}>{formatCurrency(entry.newAmount)}</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>
                by {entry.changedBy} · {new Date(entry.changedAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
