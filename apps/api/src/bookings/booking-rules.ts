import { randomInt } from 'node:crypto';
import { BookingStatus, BookingType } from '@eul/db';

/**
 * The one state machine for booking statuses (CLAUDE.md §4.1).
 * Manual assignment is allowed from any status before ASSIGNED (§4.2 step 9).
 */
const TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  NEW: ['PENDING_DISPATCH', 'ASSIGNED', 'CANCELLED'],
  PENDING_DISPATCH: ['DRIVERS_NOTIFIED', 'NEEDS_ATTENTION', 'ASSIGNED', 'CANCELLED'],
  DRIVERS_NOTIFIED: ['DRIVERS_NOTIFIED', 'NEEDS_ATTENTION', 'ASSIGNED', 'CANCELLED'],
  NEEDS_ATTENTION: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['DRIVER_EN_ROUTE', 'CANCELLED'],
  DRIVER_EN_ROUTE: ['ARRIVED', 'CANCELLED'],
  ARRIVED: ['IN_JOURNEY', 'CANCELLED'],
  IN_JOURNEY: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export class InvalidTransitionError extends Error {
  constructor(
    readonly from: BookingStatus,
    readonly to: BookingStatus,
  ) {
    super(`Booking cannot move from ${from} to ${to}`);
  }
}

export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  if (!canTransition(from, to)) throw new InvalidTransitionError(from, to);
}

/** Statuses where a driver can still be assigned (manually or by acceptance). */
export const ASSIGNABLE_STATUSES: readonly BookingStatus[] = [
  BookingStatus.NEW,
  BookingStatus.PENDING_DISPATCH,
  BookingStatus.DRIVERS_NOTIFIED,
  BookingStatus.NEEDS_ATTENTION,
];

/**
 * Same-day = pickup within `thresholdHours` of the moment the booking is created (§4.2, D-22).
 * A time difference does not depend on the time zone, so DST changes cannot shift it.
 */
export function bookingTypeFor(pickupAt: Date, createdAt: Date, thresholdHours: number): BookingType {
  const diffMs = pickupAt.getTime() - createdAt.getTime();
  return diffMs <= thresholdHours * 60 * 60 * 1000 ? BookingType.SAME_DAY : BookingType.FUTURE;
}

// No 0/O, 1/I/L — easy to read out on the phone.
const REFERENCE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** e.g. "EUL-7KQ2MX". Uniqueness is enforced by the database; the caller retries on a clash. */
export function newBookingReference(): string {
  let code = '';
  for (let i = 0; i < 6; i++) code += REFERENCE_ALPHABET[randomInt(REFERENCE_ALPHABET.length)];
  return `EUL-${code}`;
}
