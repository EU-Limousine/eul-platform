import { useTranslation } from 'react-i18next';
import { PageTitle } from './page-title';

/** Temporary page for menu items whose screen is not built yet. */
export function NotBuilt({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation();
  return (
    <section>
      <PageTitle>{t(titleKey)}</PageTitle>
      <p className="mt-4 rounded-card border border-border bg-surface p-6 text-text-muted">{t('common.notBuilt')}</p>
    </section>
  );
}
