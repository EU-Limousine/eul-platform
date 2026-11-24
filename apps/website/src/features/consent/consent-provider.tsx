'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  buildConsent,
  enabledCategories,
  isWithdrawal,
  readConsentCookie,
  writeConsentCookie,
  type ConsentCategory,
  type ConsentChoices,
  type StoredConsent,
} from './consent';
import { ConsentBanner } from './consent-banner';
import { ConsentSettings } from './consent-settings';

interface ConsentContextValue {
  /** Optional categories this site uses. Empty = no banner, no settings link. */
  enabled: readonly ConsentCategory[];
  /** undefined while reading the cookie, null = not decided yet. */
  consent: StoredConsent | null | undefined;
  granted: (category: ConsentCategory) => boolean;
  save: (choices: Partial<ConsentChoices>) => void;
  acceptAll: () => void;
  rejectAll: () => void;
  openSettings: () => void;
}

const ConsentContext = createContext<ConsentContextValue | null>(null);
const ENABLED = enabledCategories();

/** Holds the visitor's cookie choices and shows the banner until they decide. */
export function ConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<StoredConsent | null | undefined>(undefined);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // The cookie is read after mount, so server and client render the same HTML (no banner flash in SSR).
  useEffect(() => setConsent(ENABLED.length ? readConsentCookie() : null), []);

  const save = useCallback(
    (choices: Partial<ConsentChoices>) => {
      const next = buildConsent(choices, ENABLED, new Date());
      writeConsentCookie(next);
      setSettingsOpen(false);
      // A withdrawn category may already have loaded scripts: reload so nothing keeps running.
      if (isWithdrawal(consent?.choices, next.choices)) window.location.reload();
      else setConsent(next);
    },
    [consent],
  );

  const value = useMemo<ConsentContextValue>(
    () => ({
      enabled: ENABLED,
      consent,
      granted: (category) => consent?.choices[category] === true,
      save,
      acceptAll: () => save(Object.fromEntries(ENABLED.map((c) => [c, true]))),
      rejectAll: () => save({}),
      openSettings: () => setSettingsOpen(true),
    }),
    [consent, save],
  );

  return (
    <ConsentContext.Provider value={value}>
      {children}
      {ENABLED.length > 0 && consent === null && !settingsOpen && (
        <ConsentBanner onAcceptAll={value.acceptAll} onRejectAll={value.rejectAll} onChoose={value.openSettings} />
      )}
      {ENABLED.length > 0 && settingsOpen && (
        <ConsentSettings
          enabled={ENABLED}
          initial={consent?.choices}
          onSave={save}
          onAcceptAll={value.acceptAll}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </ConsentContext.Provider>
  );
}

export function useConsent(): ConsentContextValue {
  const value = useContext(ConsentContext);
  if (!value) throw new Error('useConsent must be used inside ConsentProvider');
  return value;
}

/**
 * Renders its children only after the visitor granted the category.
 * Wrap every optional script in this, e.g. <ConsentGate category="statistics"><Analytics /></ConsentGate>.
 */
export function ConsentGate({ category, children }: { category: ConsentCategory; children: ReactNode }) {
  return useConsent().granted(category) ? <>{children}</> : null;
}
