import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/features/auth/auth-store';
import { cn } from '@/shared/lib/utils';
import { BrandLogo } from '@/shared/ui/brand-logo';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/shared/ui/shadcn/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/shadcn/tooltip';
import { NAV_ITEMS, type NavItem } from './nav-items';
import { useShell } from './shell-store';

// TODO(content): placeholder photo cropped from the dashboard design.
const PHOTO = '/brand/sidebar-car.webp';

export function useVisibleNavItems(): NavItem[] {
  const permissions = useAuthStore((s) => s.user?.permissions ?? []);
  return NAV_ITEMS.filter((item) => !item.permission || permissions.includes(item.permission));
}

function NavLinks({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { t } = useTranslation();
  const items = useVisibleNavItems();
  return (
    <ul className="flex flex-col gap-1 px-3">
      {items.map((item) => {
        const label = t(item.labelKey);
        const link = (
          <Link
            to={item.to}
            onClick={onNavigate}
            activeOptions={{ exact: item.to === '/' }}
            aria-label={collapsed ? label : undefined}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-sidebar-foreground/75 transition-colors',
              'hover:bg-sidebar-accent hover:text-sidebar-foreground',
              collapsed && 'justify-center px-0',
            )}
            activeProps={{
              className:
                'bg-gradient-to-r from-sidebar-primary/90 to-sidebar-primary/60 text-sidebar-primary-foreground! font-medium shadow-sm hover:from-sidebar-primary',
            }}
          >
            <item.icon size={19} aria-hidden className="shrink-0" />
            {!collapsed && label}
          </Link>
        );
        return (
          <li key={item.to}>
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{label}</TooltipContent>
              </Tooltip>
            ) : (
              link
            )}
          </li>
        );
      })}
    </ul>
  );
}

function SidebarBody({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { t } = useTranslation();
  return (
    <nav aria-label={t('nav.mainMenu')} className="relative flex h-full flex-col overflow-hidden bg-sidebar text-sidebar-foreground">
      <div className={cn('flex items-center justify-center py-6', collapsed ? 'px-2' : 'px-6')}>
        {collapsed ? (
          <span className="font-display text-xl font-semibold text-sidebar-primary" aria-label={t('brand')}>
            EU
          </span>
        ) : (
          <BrandLogo className="w-40" />
        )}
      </div>
      <div className="relative z-10 flex-1 overflow-y-auto pb-4">
        <NavLinks collapsed={collapsed} onNavigate={onNavigate} />
      </div>
      {!collapsed && (
        <div className="pointer-events-none relative h-40 shrink-0" aria-hidden>
          <img src={PHOTO} alt="" className="absolute inset-0 size-full object-cover object-left opacity-70" />
          <div className="absolute inset-0 bg-gradient-to-b from-sidebar to-transparent" />
        </div>
      )}
    </nav>
  );
}

/** Navy sidebar (both themes). Desktop: fixed column, collapsible to icons. Mobile: a sheet. */
export function Sidebar() {
  const { t } = useTranslation();
  const { collapsed, mobileOpen, setMobileOpen } = useShell();
  return (
    <>
      <aside className={cn('hidden shrink-0 transition-[width] lg:block', collapsed ? 'w-[72px]' : 'w-[var(--sidebar-width)]')}>
        <SidebarBody collapsed={collapsed} />
      </aside>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[var(--sidebar-width)] border-0 p-0">
          <SheetTitle className="sr-only">{t('nav.mainMenu')}</SheetTitle>
          <SheetDescription className="sr-only">{t('brand')}</SheetDescription>
          <SidebarBody collapsed={false} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
