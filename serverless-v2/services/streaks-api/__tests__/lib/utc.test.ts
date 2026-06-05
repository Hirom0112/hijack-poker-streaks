import { utcDay, yesterday, daysBetween, yearMonth } from '../../src/lib/utc';

describe('lib/utc — UTC calendar-day helpers (Inv 1)', () => {
  it('utcDay() returns the UTC ISO date string for an instant', () => {
    expect(utcDay('2026-02-20T00:00:00Z')).toBe('2026-02-20');
  });

  it('yesterday() returns the prior UTC date (crossing a month boundary)', () => {
    expect(yesterday('2026-03-01')).toBe('2026-02-28');
  });

  it('daysBetween() returns the integer day count b − a', () => {
    expect(daysBetween('2026-02-18', '2026-02-20')).toBe(2);
  });

  it('yearMonth() returns YYYY-MM for an ISO date', () => {
    expect(yearMonth('2026-06-05')).toBe('2026-06');
  });
});
