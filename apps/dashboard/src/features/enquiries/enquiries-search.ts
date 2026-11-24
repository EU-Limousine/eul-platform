import type { EnquiryType } from '@eul/api-client';

/** Inbox tab: open messages first (default), handled ones, or everything. */
export const ENQUIRY_TABS = ['new', 'handled', 'all'] as const;
export type EnquiryTab = (typeof ENQUIRY_TABS)[number];

export const ENQUIRY_TYPES = ['GENERAL', 'BUSINESS', 'EVENT'] as const satisfies readonly EnquiryType[];

/** Filters and page live in the URL. Every key is optional so a plain link to /enquiries works. */
export interface EnquiriesSearch {
  tab?: EnquiryTab;
  type?: EnquiryType;
  q?: string;
  page?: number;
}

export function validateEnquiriesSearch(raw: Record<string, unknown>): EnquiriesSearch {
  const page = Number(raw.page);
  return {
    tab: (ENQUIRY_TABS as readonly unknown[]).includes(raw.tab) && raw.tab !== 'new' ? (raw.tab as EnquiryTab) : undefined,
    type: (ENQUIRY_TYPES as readonly unknown[]).includes(raw.type) ? (raw.type as EnquiryType) : undefined,
    q: typeof raw.q === 'string' && raw.q.trim() ? raw.q.trim().slice(0, 80) : undefined,
    page: Number.isInteger(page) && page > 1 ? page : undefined,
  };
}

/** Tab → API status filter. */
export function statusForTab(tab: EnquiryTab): 'NEW' | 'HANDLED' | undefined {
  if (tab === 'new') return 'NEW';
  if (tab === 'handled') return 'HANDLED';
  return undefined;
}
