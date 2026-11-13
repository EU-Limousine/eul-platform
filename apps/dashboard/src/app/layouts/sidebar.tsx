import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/features/auth/auth-store';
import { NAV_ITEMS } from './nav-items';

export function Sidebar() {
  const { t } = useTranslation();
  const permissions = useAuthStore((s) => s.user?.permissions ?? []);
  const items = NAV_ITEMS.filter((item) => !item.permission || permissions.includes(item.permission));

  return (
    <nav
      aria-label={t('nav.mainMenu')}
      className="flex w-[var(--sidebar-width)] shrink-0 flex-col bg-navy-900 text-on-dark"
    >
      <div className="flex h-[var(--topbar-height)] items-center px-5 font-display text-lg font-semibold">
        {t('brand')}
      </div>
      <ul className="flex flex-col gap-1 px-3 py-4">
        {items.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              activeOptions={{ exact: item.to === '/' }}
              className="flex items-center gap-3 rounded-control border-l-2 border-transparent px-3 py-2 text-sm text-on-dark-muted hover:bg-navy-700 hover:text-on-dark"
              activeProps={{ className: 'border-gold bg-navy-800 text-on-dark' }}
            >
              <item.icon size={18} aria-hidden />
              {t(item.labelKey)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
