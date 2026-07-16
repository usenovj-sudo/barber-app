import { resolvePeriod, dayKey } from './period.util';

describe('period.util', () => {
  describe('resolvePeriod', () => {
    it('resolves a single day [00:00, next 00:00)', () => {
      const r = resolvePeriod('day', '2026-06-21T15:30:00.000Z');
      expect(r.period).toBe('day');
      expect(r.from.getHours()).toBe(0);
      expect(r.from.getMinutes()).toBe(0);
      const diffHours = (r.to.getTime() - r.from.getTime()) / 3_600_000;
      expect(diffHours).toBe(24);
    });

    it('resolves an ISO week starting Monday (7 days)', () => {
      // 2026-06-21 is a Sunday → week should start Monday 2026-06-15
      const r = resolvePeriod('week', '2026-06-21T12:00:00.000Z');
      expect(r.from.getDay()).toBe(1); // Monday
      const days = (r.to.getTime() - r.from.getTime()) / 86_400_000;
      expect(days).toBe(7);
    });

    it('resolves a calendar month', () => {
      const r = resolvePeriod('month', '2026-06-21T12:00:00.000Z');
      expect(r.from.getDate()).toBe(1);
      expect(r.from.getMonth()).toBe(5); // June (0-indexed)
      expect(r.to.getMonth()).toBe(6); // July
      expect(r.to.getDate()).toBe(1);
    });

    it('defaults to now when no date given', () => {
      const r = resolvePeriod('day');
      expect(r.from).toBeInstanceOf(Date);
      expect(r.to.getTime()).toBeGreaterThan(r.from.getTime());
    });

    it('throws on an invalid date', () => {
      expect(() => resolvePeriod('day', 'not-a-date')).toThrow();
    });
  });

  describe('dayKey', () => {
    it('formats YYYY-MM-DD with zero padding', () => {
      expect(dayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
      expect(dayKey(new Date(2026, 11, 31))).toBe('2026-12-31');
    });
  });
});
