'use client';

import { useState } from 'react';
import { Trash2, ChevronDown } from 'lucide-react';
import { BudgetProgress } from './BudgetProgress';
import { BudgetEditor } from './BudgetEditor';
import { BudgetHistoryLog } from './BudgetHistoryLog';
import { formatCurrency } from '@/lib/utils';

interface Budget {
  id: string;
  channel: string;
  period: string;
  amount: number;
  spentAmount: number;
  history: any[];
}

interface BudgetTableProps {
  budgets: Budget[];
  isOwner: boolean;
  onUpdate: (id: string, field: 'amount' | 'spentAmount', value: number) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function BudgetTable({ budgets, isOwner, onUpdate, onDelete }: BudgetTableProps) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try { await onDelete(id); }
    finally { setDeleting(null); setConfirmDelete(null); }
  };

  const thStyle: React.CSSProperties = { padding: '12px 16px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #333', whiteSpace: 'nowrap' };
  const tdStyle: React.CSSProperties = { padding: '16px', fontSize: '0.875rem', borderBottom: '1px solid #2A2A2A', verticalAlign: 'top' };

  if (!budgets.length) {
    return (
      <div style={{ background: '#242424', border: '1px dashed #333', borderRadius: 12, padding: 48, textAlign: 'center', color: '#9CA3AF', fontSize: '0.875rem' }}>
        No budgets added yet. {isOwner ? 'Click "Add Budget" to get started.' : ''}
      </div>
    );
  }

  return (
    <div style={{ background: '#242424', border: '1px solid #333', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Channel</th>
              <th style={thStyle}>Period</th>
              <th style={thStyle}>Budget</th>
              <th style={thStyle}>Spent</th>
              <th style={thStyle}>Remaining</th>
              <th style={{ ...thStyle, width: 160 }}>Usage</th>
              {isOwner && <th style={{ ...thStyle, width: 80 }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {budgets.map(b => {
              const remaining = b.amount - b.spentAmount;
              return (
                <tr key={b.id} style={{ transition: 'background 0.1s' }}
                  onMouseEnter={e => { (e.currentTarget).style.background = 'rgba(51,51,51,0.3)'; }}
                  onMouseLeave={e => { (e.currentTarget).style.background = 'transparent'; }}
                >
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600, color: '#F5F5F5' }}>{b.channel}</div>
                    <BudgetHistoryLog history={b.history || []} />
                  </td>
                  <td style={{ ...tdStyle }}>
                    <span style={{ background: '#333', borderRadius: 4, padding: '2px 8px', fontSize: '0.75rem', color: '#9CA3AF' }}>{b.period}</span>
                  </td>
                  <td style={tdStyle}>
                    <BudgetEditor value={b.amount} onSave={v => onUpdate(b.id, 'amount', v)} disabled={!isOwner} />
                  </td>
                  <td style={tdStyle}>
                    <BudgetEditor value={b.spentAmount} onSave={v => onUpdate(b.id, 'spentAmount', v)} disabled={!isOwner} />
                  </td>
                  <td style={{ ...tdStyle, color: remaining < 0 ? '#EF4444' : '#9CA3AF' }}>
                    {formatCurrency(remaining)}
                  </td>
                  <td style={tdStyle}>
                    <BudgetProgress amount={b.amount} spentAmount={b.spentAmount} />
                  </td>
                  {isOwner && (
                    <td style={tdStyle}>
                      {confirmDelete === b.id ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => handleDelete(b.id)} disabled={!!deleting} style={{ background: '#EF4444', border: 'none', borderRadius: 4, padding: '4px 8px', color: 'white', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700 }}>
                            {deleting === b.id ? '...' : 'Yes'}
                          </button>
                          <button onClick={() => setConfirmDelete(null)} style={{ background: '#333', border: 'none', borderRadius: 4, padding: '4px 8px', color: '#F5F5F5', cursor: 'pointer', fontSize: '0.7rem' }}>No</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDelete(b.id)} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 4, borderRadius: 4, display: 'flex', alignItems: 'center' }}
                          onMouseEnter={e => { (e.currentTarget).style.color = '#EF4444'; (e.currentTarget).style.background = 'rgba(239,68,68,0.1)'; }}
                          onMouseLeave={e => { (e.currentTarget).style.color = '#9CA3AF'; (e.currentTarget).style.background = 'none'; }}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
