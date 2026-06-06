import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toLocaleString();
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

export function calcDelta(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function calcDeltaFormatted(current: number, previous: number): string {
  const delta = calcDelta(current, previous);
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)}%`;
}

export function isTokenExpiringSoon(expiresAt: Date | null | undefined, daysThreshold = 7): boolean {
  if (!expiresAt) return false;
  const now = new Date();
  const daysUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return daysUntilExpiry <= daysThreshold;
}

export function isTokenExpired(expiresAt: Date | null | undefined): boolean {
  if (!expiresAt) return false;
  return new Date() > expiresAt;
}

export function getDaysUntilExpiry(expiresAt: Date | null | undefined): number {
  if (!expiresAt) return Infinity;
  const now = new Date();
  return Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
