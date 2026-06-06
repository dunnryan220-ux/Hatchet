export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function getDateRangePresets(): { label: string; from: Date; to: Date }[] {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const last7Start = new Date(today);
  last7Start.setDate(last7Start.getDate() - 7);

  const last30Start = new Date(today);
  last30Start.setDate(last30Start.getDate() - 30);

  const last90Start = new Date(today);
  last90Start.setDate(last90Start.getDate() - 90);

  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

  return [
    { label: 'Last 7 days', from: last7Start, to: today },
    { label: 'Last 30 days', from: last30Start, to: today },
    { label: 'Last 90 days', from: last90Start, to: today },
    { label: 'This month', from: thisMonthStart, to: today },
    { label: 'Last month', from: lastMonthStart, to: lastMonthEnd },
  ];
}

export function getPreviousPeriod(from: Date, to: Date): { from: Date; to: Date } {
  const duration = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - duration);
  return { from: prevFrom, to: prevTo };
}

export function generateDateRange(from: Date, to: Date): string[] {
  const dates: string[] = [];
  const current = new Date(from);
  while (current <= to) {
    dates.push(formatDateISO(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
