'use client';

import { useState, useRef, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';

interface BudgetEditorProps {
  value: number;
  onSave: (newValue: number) => Promise<void>;
  disabled?: boolean;
  format?: 'currency' | 'number';
}

export function BudgetEditor({ value, onSave, disabled = false, format = 'currency' }: BudgetEditorProps) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(String(value));
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleSave = async () => {
    const num = parseFloat(inputValue);
    if (isNaN(num) || num === value) { setEditing(false); return; }
    setSaving(true);
    try {
      await onSave(num);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  if (disabled) {
    return <span style={{ color: '#F5F5F5', fontSize: '0.875rem' }}>{format === 'currency' ? formatCurrency(value) : value.toLocaleString()}</span>;
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
        disabled={saving}
        style={{ width: 100, background: '#1A1A1A', border: '1px solid #FF4500', borderRadius: 4, padding: '3px 8px', color: '#F5F5F5', fontSize: '0.875rem', outline: 'none' }}
      />
    );
  }

  return (
    <button onClick={() => { setInputValue(String(value)); setEditing(true); }}
      style={{ background: 'none', border: 'none', color: '#F5F5F5', cursor: 'pointer', padding: '2px 4px', borderRadius: 4, fontSize: '0.875rem', textDecoration: 'underline dotted #555' }}
      title="Click to edit"
    >
      {format === 'currency' ? formatCurrency(value) : value.toLocaleString()}
    </button>
  );
}
