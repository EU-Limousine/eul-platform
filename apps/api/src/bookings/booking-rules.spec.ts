import { BookingStatus, BookingType } from '@eul/db';
import {
  ASSIGNABLE_STATUSES,
  assertTransition,
  bookingTypeFor,
  canTransition,
  InvalidTransitionError,
  newBookingReference,
} from './booking-rules';

describe('booking status transitions', () => {
  it('follows the normal trip path', () => {
    const path: BookingStatus[] = ['NEW', 'PENDING_DISPATCH', 'DRIVERS_NOTIFIED', 'ASSIGNED', 'DRIVER_EN_ROUTE', 'ARRIVED', 'IN_JOURNEY', 'COMPLETED'];
    for (let i = 0; i < path.length - 1; i++) expect(canTransition(path[i]!, path[i + 1]!)).toBe(true);
  });

  it('allows manual assignment from every status before ASSIGNED', () => {
    for (const status of ASSIGNABLE_STATUSES) expect(canTransition(status, BookingStatus.ASSIGNED)).toBe(true);
  });

  it('never leaves COMPLETED or CANCELLED', () => {
    for (const to of Object.values(BookingStatus)) {
      expect(canTransition(BookingStatus.COMPLETED, to)).toBe(false);
      expect(canTransition(BookingStatus.CANCELLED, to)).toBe(false);
    }
  });

  it('cannot cancel a trip with the passenger on board', () => {
    expect(canTransition(BookingStatus.IN_JOURNEY, BookingStatus.CANCELLED)).toBe(false);
  });

  it('throws on an invalid move', () => {
    expect(() => assertTransition(BookingStatus.NEW, BookingStatus.COMPLETED)).toThrow(InvalidTransitionError);
  });
});

describe('bookingTypeFor', () => {
  const created = new Date('2026-11-13T10:00:00Z');

  it('is SAME_DAY within the threshold (inclusive)', () => {
    expect(bookingTypeFor(new Date('2026-11-13T14:00:00Z'), created, 4)).toBe(BookingType.SAME_DAY);
  });

  it('is FUTURE after the threshold', () => {
    expect(bookingTypeFor(new Date('2026-11-13T14:00:01Z'), created, 4)).toBe(BookingType.FUTURE);
  });

  it('is not shifted by the DST change (last Sunday of March, Copenhagen)', () => {
    // 00:30 UTC → 04:30 UTC is 4 real hours, even though local clocks jump 02:00 → 03:00.
    const c = new Date('2026-03-29T00:30:00Z');
    expect(bookingTypeFor(new Date('2026-03-29T04:30:00Z'), c, 4)).toBe(BookingType.SAME_DAY);
    expect(bookingTypeFor(new Date('2026-03-29T04:31:00Z'), c, 4)).toBe(BookingType.FUTURE);
  });

  it('is not shifted by the DST change (last Sunday of October, Copenhagen)', () => {
    const c = new Date('2026-10-25T00:00:00Z');
    expect(bookingTypeFor(new Date('2026-10-25T05:00:00Z'), c, 5)).toBe(BookingType.SAME_DAY);
    expect(bookingTypeFor(new Date('2026-10-25T05:00:01Z'), c, 5)).toBe(BookingType.FUTURE);
  });
});

describe('newBookingReference', () => {
  it('has the EUL- prefix and 6 unambiguous characters', () => {
    for (let i = 0; i < 200; i++) expect(newBookingReference()).toMatch(/^EUL-[A-HJKMNP-Z2-9]{6}$/);
  });
});
