import { describe, expect, it } from 'vitest';
import { statusForTab, validateEnquiriesSearch } from './enquiries-search';

describe('validateEnquiriesSearch', () => {
  it('keeps valid values and drops defaults', () => {
    expect(validateEnquiriesSearch({ tab: 'handled', type: 'BUSINESS', q: ' acme ', page: '2' })).toEqual({
      tab: 'handled',
      type: 'BUSINESS',
      q: 'acme',
      page: 2,
    });
    expect(validateEnquiriesSearch({ tab: 'new', page: '1' })).toEqual({ tab: undefined, type: undefined, q: undefined, page: undefined });
  });

  it('ignores unknown values from a hand-edited URL', () => {
    expect(validateEnquiriesSearch({ tab: 'spam', type: 'VIP', q: '   ', page: 'x' })).toEqual({
      tab: undefined,
      type: undefined,
      q: undefined,
      page: undefined,
    });
  });
});

describe('statusForTab', () => {
  it('maps tabs to the API filter', () => {
    expect(statusForTab('new')).toBe('NEW');
    expect(statusForTab('handled')).toBe('HANDLED');
    expect(statusForTab('all')).toBeUndefined();
  });
});
