import { DEV_PLACES, searchDevPlaces } from './dev-places';

describe('dev places (no Maps key)', () => {
  it('finds places by name, case-insensitive', () => {
    expect(searchDevPlaces('airport').map((p) => p.placeId)).toContain('dev-cph-airport');
    expect(searchDevPlaces('NYHAVN')).toHaveLength(1);
  });

  it('returns nothing for an empty query', () => {
    expect(searchDevPlaces('  ')).toEqual([]);
  });

  it('has valid coordinates', () => {
    for (const p of DEV_PLACES) {
      expect(Math.abs(p.lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(p.lng)).toBeLessThanOrEqual(180);
    }
  });
});
