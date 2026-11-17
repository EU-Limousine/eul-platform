import { describe, expect, it } from 'vitest';
import { percentChange, timeAgo, weekdayLabel } from './trend';

describe('percentChange', () => {
  it('rounds the change', () => {
    expect(percentChange(112, 100)).toBe(12);
    expect(percentChange(90, 100)).toBe(-10);
  });
  it('returns null when there is no previous value', () => {
    expect(percentChange(5, 0)).toBeNull();
  });
});

describe('weekdayLabel', () => {
  it('keeps the calendar day across the October DST change', () => {
    expect(weekdayLabel('2026-10-25')).toBe('Sun');
    expect(weekdayLabel('2026-03-29')).toBe('Sun');
  });
});

describe('timeAgo', () => {
  it('uses minutes and hours', () => {
    const now = new Date('2026-11-14T12:00:00Z');
    expect(timeAgo('2026-11-14T11:55:00Z', now)).toBe('5 minutes ago');
    expect(timeAgo('2026-11-14T10:00:00Z', now)).toBe('2 hours ago');
  });
});
