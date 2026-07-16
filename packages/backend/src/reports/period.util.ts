// Resolves a reporting period (day/week/month) anchored on a reference date
// into a concrete [from, to) datetime range. Week starts Monday.

export type ReportPeriod = 'day' | 'week' | 'month';

export interface PeriodRange {
  period: ReportPeriod;
  from: Date;
  to: Date;
  label: string;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function resolvePeriod(period: ReportPeriod, dateStr?: string): PeriodRange {
  const ref = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(ref.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }

  if (period === 'day') {
    const from = startOfDay(ref);
    const to = new Date(from);
    to.setDate(from.getDate() + 1);
    return { period, from, to, label: from.toLocaleDateString('ru-RU') };
  }

  if (period === 'week') {
    // ISO week: Monday as first day
    const from = startOfDay(ref);
    const dow = (from.getDay() + 6) % 7; // 0 = Monday
    from.setDate(from.getDate() - dow);
    const to = new Date(from);
    to.setDate(from.getDate() + 7);
    const lastDay = new Date(to);
    lastDay.setDate(to.getDate() - 1);
    return {
      period,
      from,
      to,
      label: `${from.toLocaleDateString('ru-RU')} — ${lastDay.toLocaleDateString('ru-RU')}`,
    };
  }

  // month
  const from = new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0, 0);
  const to = new Date(ref.getFullYear(), ref.getMonth() + 1, 1, 0, 0, 0, 0);
  return {
    period,
    from,
    to,
    label: from.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }),
  };
}

// Returns YYYY-MM-DD in local time, used for daily-trend bucketing
export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
