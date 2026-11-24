import { EnquiryStatus } from '@eul/db';

export interface EnquiryStatusFields {
  status: EnquiryStatus;
  handledAt: Date | null;
  handledById: string | null;
}

/**
 * The only rule for changing an enquiry's status.
 * NEW → HANDLED records who and when; HANDLED → NEW (reopen) clears both.
 * Returns null when nothing changes, so the caller writes no update and no audit row.
 */
export function enquiryStatusChange(
  current: EnquiryStatusFields,
  target: EnquiryStatus,
  actorId: string,
  now: Date,
): EnquiryStatusFields | null {
  if (current.status === target) return null;
  if (target === EnquiryStatus.HANDLED) return { status: target, handledAt: now, handledById: actorId };
  return { status: target, handledAt: null, handledById: null };
}
