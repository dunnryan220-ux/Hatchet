'use client';

import { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { getDateRangePresets, formatDate } from '@/lib/date-utils';
import { DateRange } from '@/types';

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const presets = getDateRangePresets();
  const activePreset = presets.find(p => formatDate(p.from) === formatDate(value.from) && formatDate(p.to) === formatDate(value.to));

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#242424', border: '1px solid #333', borderRadius: 8, padding: '8px 14px', color: '#F5F5F5', cursor: 'pointer', fontSize: '0.875rem' }}
        onMouseEnter={e => { (e.currentTarget).style.borderColor = '#FF4500'; }}
        onMouseLeave={e => { (e.currentTarget).style.borderColor = '#333'; }}
      >
        <Calendar size={15} color="#FF4500" />
        <span>{activePreset?.label || `${formatDate(value.from)} — ${formatDate(value.to)}`}</span>
        <ChevronDown size={14} color="#9CA3AF" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, background: '#242424', border: '1px solid #333', borderRadius: 8, zIndex: 50, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', minWidth: 180 }}>
            {presets.map(preset => {
              const isActive = activePreset?.label === preset.label;
              return (
                <button key={preset.label} onClick={() => { onChange({ from: preset.from, to: preset.to }); setOpen(false); }}
                  style={{ display: 'block', width: '100%', padding: '9px 16px', background: isActive ? 'rgba(255,69,0,0.1)' : 'transparent', border: 'none', textAlign: 'left', color: isActive ? '#FF4500' : '#F5F5F5', cursor: 'pointer', fontSize: '0.875rem' }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget).style.background = 'rgba(51,51,51,0.8)'; }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget).style.background = 'transparent'; }}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
