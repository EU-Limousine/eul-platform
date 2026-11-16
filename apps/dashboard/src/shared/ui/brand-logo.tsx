import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/utils';

// TODO(content): temporary logo until the final one (logo design brief, D-11). Swap the file only.
const LOGO = '/brand/logo-temp.png';

export function BrandLogo({ className }: { className?: string }) {
  const { t } = useTranslation();
  return <img src={LOGO} alt={t('brand')} width={236} height={66} className={cn('h-auto', className)} />;
}
