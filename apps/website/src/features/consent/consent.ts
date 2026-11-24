/**
 * Cookie consent: the rules, with no React in them.
 *
 * Necessary storage (language cookie, booking draft, security check) needs no consent and is always on.
 * Optional categories are switched on only when the site really uses them, via
 * NEXT_PUBLIC_CONSENT_CATEGORIES (e.g. "statistics"). Empty = nothing optional = no banner,
 * because asking for consent to tools we do not use would mislead visitors.
 */
export const OPTIONAL_CATEGORIES = ['statistics', 'marketing'] as const;
export type ConsentCategory = (typeof OPTIONAL_CATEGORIES)[number];
export type ConsentChoices = Record<ConsentCategory, boolean>;

export interface StoredConsent {
  /** Bump CONSENT_VERSION when the categories or tools change: everyone is asked again. */
  v: number;
  /** ISO time of the choice, so we can show when consent was given. */
  at: string;
  choices: ConsentChoices;
}

export const CONSENT_COOKIE = 'eul_consent';
export const CONSENT_VERSION = 1;
/** Ask again after 12 months at the latest. */
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export const NONE: ConsentChoices = { statistics: false, marketing: false };

/** Categories this deployment actually uses (from env; unknown names are ignored). */
export function enabledCategories(raw: string | undefined = process.env.NEXT_PUBLIC_CONSENT_CATEGORIES): ConsentCategory[] {
  const wanted = (raw ?? '').split(',').map((s) => s.trim().toLowerCase());
  return OPTIONAL_CATEGORIES.filter((c) => wanted.includes(c));
}

/** Parse the cookie value. Anything unexpected (old version, hand-edited) counts as "not decided". */
export function parseConsent(value: string | undefined): StoredConsent | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<StoredConsent>;
    if (parsed.v !== CONSENT_VERSION || typeof parsed.at !== 'string' || !parsed.choices) return null;
    const choices = { ...NONE };
    for (const c of OPTIONAL_CATEGORIES) choices[c] = parsed.choices[c] === true;
    return { v: CONSENT_VERSION, at: parsed.at, choices };
  } catch {
    return null;
  }
}

/** Only categories that are enabled can be granted; everything else is stored as false. */
export function buildConsent(choices: Partial<ConsentChoices>, enabled: readonly ConsentCategory[], now: Date): StoredConsent {
  const clean = { ...NONE };
  for (const c of enabled) clean[c] = choices[c] === true;
  return { v: CONSENT_VERSION, at: now.toISOString(), choices: clean };
}

export function readConsentCookie(): StoredConsent | null {
  const entry = document.cookie.split('; ').find((c) => c.startsWith(`${CONSENT_COOKIE}=`));
  return parseConsent(entry?.slice(CONSENT_COOKIE.length + 1));
}

export function writeConsentCookie(consent: StoredConsent): void {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(consent))}; Max-Age=${CONSENT_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
}

/** True when a category that was granted is now refused (scripts already loaded must be unloaded). */
export function isWithdrawal(before: ConsentChoices | undefined, after: ConsentChoices): boolean {
  if (!before) return false;
  return OPTIONAL_CATEGORIES.some((c) => before[c] && !after[c]);
}
