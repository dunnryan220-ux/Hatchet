'use client';

import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';
import { calcDelta, formatNumber, formatCurrency, formatPercent, formatDuration } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: number | string;
  previousValue?: number | string;
  unit?: string;
  icon?: LucideIcon;
  format?: 'number' | 'currency' | 'percent' | 'duration' | 'text';
  invertDelta?: boolean;
  loading?: boolean;
}

function formatValue(value: number | string, format?: string, unit?: string): string {
  if (typeof value === 'string') return value;
  switch (format) {
    case 'currency': return formatCurrency(value);
    case 'percent': return formatPercent(value);
    case 'duration': return formatDuration(value);
    case 'number': return formatNumber(value);
    default: return unit ? `${formatNumber(value)}${unit}` : formatNumber(value);
  }
}

export function KPICard({ title, value, previousValue, unit, icon: Icon, format, invertDelta = false, loading = false }: KPICardProps) {
  const numVal = typeof value === 'number' ? value : 0;
  const numPrev = typeof previousValue === 'number' ? previousValue : undefined;
  let delta: number | null = null;
  if (numPrev !== undefined) delta = calcDelta(numVal, numPrev);
  const isPositive = delta !== null ? (invertDelta ? delta < 0 : delta > 0) : null;

  if (loading) {
    return (
      <div style={{ background: '#242424', border: '1px solid #333', borderRadius: 12, padding: 24 }}>
        {[0.6, 0.4, 0.3].map((w, i) => (
          <div key={i} style={{ height: i === 1 ? 28 : 12, width: `${w * 100}%`, background: '#333', borderRadius: 4, marginBottom: 12 }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ background: '#242424', border: '1px solid #333', borderRadius: 12, padding: 24, position: 'relative', overflow: 'hidden', transition: 'border-color 0.15s' }}
      onMouseEnter={e => { (e.currentTarget).style.borderColor = '#444'; }}
      onMouseLeave={e => { (e.currentTarget).style.borderColor = '#333'; }}
    >
      {Icon && (
        <div style={{ position: 'absolute', top: 20, right: 20, width: 36, height: 36, borderRadius: 8, background: 'rgba(255,69,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} color="#FF4500" />
        </div>
      )}
      <div style={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 500, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</div>
      <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#F5F5F5', marginBottom: 8, lineHeight: 1 }}>{formatValue(value, format, unit)}</div>
      {delta !== null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem' }}>
          {isPositive ? <TrendingUp size={13} color="#22C55E" /> : isPositive === false ? <TrendingDown size={13} color="#EF4444" /> : <Minus size={13} color="#9CA3AF" />}
          <span style={{ color: isPositive ? '#22C55E' : isPositive === false ? '#EF4444' : '#9CA3AF', fontWeight: 600 }}>
            {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
          </span>
          <span style={{ color: '#9CA3AF' }}>vs prev</span>
        </div>
      )}
    </div>
  );
}

export function KPICardSkeleton() {
  return <KPICard title="" value={0} loading={true} />;
}
