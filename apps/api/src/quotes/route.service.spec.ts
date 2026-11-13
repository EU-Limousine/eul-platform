import { estimateRoute, haversineMeters } from './route.service';

// Copenhagen Airport (CPH) and Copenhagen Central Station — public coordinates, test only.
const CPH = { lat: 55.618, lng: 12.6476 };
const CENTRAL = { lat: 55.6727, lng: 12.5644 };

describe('route estimate (dev fallback)', () => {
  it('measures straight-line distance', () => {
    const d = haversineMeters(CPH, CENTRAL);
    expect(d).toBeGreaterThan(7_000);
    expect(d).toBeLessThan(9_000);
  });

  it('returns whole numbers and marks itself as an estimate', () => {
    const r = estimateRoute(CPH, CENTRAL);
    expect(Number.isInteger(r.distanceMeters)).toBe(true);
    expect(Number.isInteger(r.durationSeconds)).toBe(true);
    expect(r.source).toBe('estimate');
  });
});
