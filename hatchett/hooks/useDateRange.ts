'use client';

import { useState } from 'react';
import { DateRange } from '@/types';

export function useDateRange(defaultDays = 30) {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(Date.now() - defaultDays * 86400000),
    to: new Date(),
  });

  return { dateRange, setDateRange };
}
