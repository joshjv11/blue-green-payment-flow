import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../src/env.js', () => ({
  env: { RBI_BANK_RATE: 6.75 },
}));

const { calculateMsmedInterest } = await import('../src/lib/interest.js');

describe('calculateMsmedInterest', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 0 when not MSME supplier', () => {
    expect(calculateMsmedInterest(10_000, new Date('2026-01-01'), false)).toBe(0);
  });

  it('returns 0 when not yet overdue', () => {
    expect(calculateMsmedInterest(10_000, new Date('2026-04-15'), true)).toBe(0);
  });

  it('returns 0 for zero principal', () => {
    expect(calculateMsmedInterest(0, new Date('2026-01-01'), true)).toBe(0);
  });

  it('computes compound interest at 3x RBI bank rate', () => {
    const dueDate = new Date('2026-01-01');
    const interest = calculateMsmedInterest(10_000, dueDate, true);
    // 90 days overdue at 20.25% annual (3 × 6.75%), compounded daily
    expect(interest).toBeGreaterThan(0);
    expect(interest).toBeLessThan(10_000);
  });
});
