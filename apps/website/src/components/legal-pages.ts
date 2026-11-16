/** Legal pages at /[locale]/legal/<slug>. Texts live in messages/<lang>.json under "legal". */
export const LEGAL_PAGES = ['terms', 'cancellation', 'privacy', 'cookies', 'company'] as const;
export type LegalPageSlug = (typeof LEGAL_PAGES)[number];

export function isLegalPage(value: string): value is LegalPageSlug {
  return (LEGAL_PAGES as readonly string[]).includes(value);
}
