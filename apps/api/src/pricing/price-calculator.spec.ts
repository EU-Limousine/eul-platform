import { Currency } from '@eul/db';
import { calculatePrice, type PriceRuleInput } from './price-calculator';

// Test values only — not real prices.
const rule: PriceRuleInput = {
  currency: Currency.DKK,
  baseFareMinor: 10_000, // 100.00
  perKmMinor: 1_500, // 15.00 per km
  perMinuteMinor: 200, // 2.00 per minute
  minimumFareMinor: 30_000, // 300.00
};

describe('calculatePrice', () => {
  it('adds base, distance and time', () => {
    const p = calculatePrice(rule, 20_000, 1_800); // 20 km, 30 min
    expect(p.distanceMinor).toBe(30_000);
    expect(p.timeMinor).toBe(6_000);
    expect(p.subtotalMinor).toBe(46_000);
    expect(p.totalMinor).toBe(46_000);
    expect(p.minimumApplied).toBe(false);
  });

  it('never goes below the minimum fare', () => {
    const p = calculatePrice(rule, 2_000, 300);
    expect(p.subtotalMinor).toBe(14_000);
    expect(p.totalMinor).toBe(30_000);
    expect(p.minimumApplied).toBe(true);
  });

  it('returns whole minor units only (no floats)', () => {
    const p = calculatePrice(rule, 12_345, 777);
    expect(Number.isInteger(p.totalMinor)).toBe(true);
    expect(p.distanceMinor).toBe(18_518); // 1500 × 12.345 = 18517.5 → 18518
    expect(p.timeMinor).toBe(2_590); // 200 × 12.95 = 2590
  });

  it('keeps the currency of the rule', () => {
    expect(calculatePrice({ ...rule, currency: Currency.EUR }, 1_000, 60).currency).toBe(Currency.EUR);
  });

  it('rejects negative or fractional inputs', () => {
    expect(() => calculatePrice(rule, -1, 0)).toThrow(RangeError);
    expect(() => calculatePrice(rule, 10.5, 0)).toThrow(RangeError);
    expect(() => calculatePrice({ ...rule, perKmMinor: 1.2 }, 1000, 0)).toThrow(RangeError);
  });
});
