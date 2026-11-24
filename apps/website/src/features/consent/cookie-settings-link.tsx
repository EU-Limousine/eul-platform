'use client';

import { useTranslations } from 'next-intl';
import { useConsent } from './consent-provider';

/** Footer link to change or withdraw consent at any time. Hidden when the site has nothing optional. */
export function CookieSettingsLink({ className = '' }: { className?: string }) {
  const t = useTranslations('consent');
  const { enabled, openSettings } = useConsent();
  if (enabled.length === 0) return null;
  return (
    <button type="button" onClick={openSettings} className={className}>
      {t('settingsLink')}
    </button>
  );
}
