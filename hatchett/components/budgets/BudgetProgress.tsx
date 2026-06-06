interface BudgetProgressProps {
  amount: number;
  spentAmount: number;
}

export function BudgetProgress({ amount, spentAmount }: BudgetProgressProps) {
  const pct = amount > 0 ? Math.min((spentAmount / amount) * 100, 100) : 0;
  const color = pct >= 90 ? '#EF4444' : pct >= 75 ? '#EAB308' : '#22C55E';

  return (
    <div>
      <div style={{ height: 6, background: '#333', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.3s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
        <span style={{ fontSize: '0.7rem', color, fontWeight: 600 }}>{pct.toFixed(0)}%</span>
      </div>
    </div>
  );
}
