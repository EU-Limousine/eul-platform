import { copenhagenDate, dateOnly, toIsoDate } from './time';

describe('copenhagenDate', () => {
  it('uses Copenhagen, not UTC, near midnight (winter, UTC+1)', () => {
    expect(copenhagenDate(new Date('2026-11-13T23:30:00Z'))).toBe('2026-11-14');
    expect(copenhagenDate(new Date('2026-11-13T22:59:00Z'))).toBe('2026-11-13');
  });

  it('uses Copenhagen near midnight in summer (UTC+2)', () => {
    expect(copenhagenDate(new Date('2026-07-01T22:30:00Z'))).toBe('2026-07-02');
    expect(copenhagenDate(new Date('2026-07-01T21:59:00Z'))).toBe('2026-07-01');
  });

  it('handles the DST change days (last Sunday of March and October)', () => {
    expect(copenhagenDate(new Date('2026-03-29T01:30:00Z'))).toBe('2026-03-29'); // 03:30 local, after the jump
    expect(copenhagenDate(new Date('2026-10-25T00:30:00Z'))).toBe('2026-10-25'); // 02:30 local, first pass
    expect(copenhagenDate(new Date('2026-10-24T21:59:00Z'))).toBe('2026-10-24'); // 23:59 local
  });
});

describe('dateOnly / toIsoDate', () => {
  it('round-trips a date', () => {
    expect(toIsoDate(dateOnly('2026-03-29'))).toBe('2026-03-29');
  });

  it('rejects bad input', () => {
    expect(() => dateOnly('2026-02-30')).toThrow(RangeError);
    expect(() => dateOnly('13-11-2026')).toThrow(RangeError);
  });
});
