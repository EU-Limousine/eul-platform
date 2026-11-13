import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/features/auth/auth-store';
import { PageTitle } from '@/shared/ui/page-title';

// TODO(design): build KPI cards and recent bookings from the operations dashboard design.
export function OverviewPage() {
  const { t } = useTranslation();
  const name = useAuthStore((s) => s.user?.name ?? '');
  return (
    <section>
      <PageTitle>{t('overview.title')}</PageTitle>
      <p className="mt-2 text-text-muted">{t('overview.welcome', { name })}</p>
    </section>
  );
}
