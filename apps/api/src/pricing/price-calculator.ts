import type { Currency } from '@eul/db';

/**
 * Pure price calculation (no database). All money in integer minor units (øre / cents).
 * Model: base fare + per km + per minute, never below the minimum fare.
 * The pricing model is still open (D-06); other models plug in next to this one.
 */
export interface PriceRuleInput {
  currency: Currency;
  baseFareMinor: number;
  perKmMinor: number;
  perMinuteMinor: number;
  minimumFareMinor: number;
}

export interface PriceBreakdown {
  currency: Currency;
  distanceMeters: number;
  durationSeconds: number;
  baseFareMinor: number;
  distanceMinor: number;
  timeMinor: number;
  subtotalMinor: number;
  minimumFareMinor: number;
  minimumApplied: boolean;
  totalMinor: number;
}

function assertWhole(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 0) throw new RangeError(`${name} must be a whole number ≥ 0`);
}

export function calculatePrice(rule: PriceRuleInput, distanceMeters: number, durationSeconds: number): PriceBreakdown {
  assertWhole('distanceMeters', distanceMeters);
  assertWhole('durationSeconds', durationSeconds);
  for (const key of ['baseFareMinor', 'perKmMinor', 'perMinuteMinor', 'minimumFareMinor'] as const) {
    assertWhole(key, rule[key]);
  }

  // Integer maths: rate × distance / unit, rounded once per component.
  const distanceMinor = Math.round((rule.perKmMinor * distanceMeters) / 1000);
  const timeMinor = Math.round((rule.perMinuteMinor * durationSeconds) / 60);
  const subtotalMinor = rule.baseFareMinor + distanceMinor + timeMinor;
  const minimumApplied = subtotalMinor < rule.minimumFareMinor;

  return {
    currency: rule.currency,
    distanceMeters,
    durationSeconds,
    baseFareMinor: rule.baseFareMinor,
    distanceMinor,
    timeMinor,
    subtotalMinor,
    minimumFareMinor: rule.minimumFareMinor,
    minimumApplied,
    totalMinor: minimumApplied ? rule.minimumFareMinor : subtotalMinor,
  };
}
