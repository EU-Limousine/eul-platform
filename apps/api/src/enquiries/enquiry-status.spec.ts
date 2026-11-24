import { EnquiryStatus } from '@eul/db';
import { enquiryStatusChange } from './enquiry-status';

const NOW = new Date('2026-11-23T10:00:00Z');
const fresh = { status: EnquiryStatus.NEW, handledAt: null, handledById: null };
const handled = { status: EnquiryStatus.HANDLED, handledAt: new Date('2026-11-22T09:00:00Z'), handledById: 'user-a' };

describe('enquiryStatusChange', () => {
  it('marks a new enquiry handled with who and when', () => {
    expect(enquiryStatusChange(fresh, EnquiryStatus.HANDLED, 'user-b', NOW)).toEqual({
      status: EnquiryStatus.HANDLED,
      handledAt: NOW,
      handledById: 'user-b',
    });
  });

  it('reopening clears who and when', () => {
    expect(enquiryStatusChange(handled, EnquiryStatus.NEW, 'user-b', NOW)).toEqual(fresh);
  });

  it('returns null when the status is already the target (no update, no audit row)', () => {
    expect(enquiryStatusChange(fresh, EnquiryStatus.NEW, 'user-b', NOW)).toBeNull();
    expect(enquiryStatusChange(handled, EnquiryStatus.HANDLED, 'user-b', NOW)).toBeNull();
  });
});
