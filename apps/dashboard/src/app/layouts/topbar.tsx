import { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TIME_ZONE } from '@eul/i18n';
import { Button } from '@/shared/ui/shadcn/button';
import { ThemeToggle } from '@/shared/ui/theme-toggle';
import { AlertsBell } from './alerts-bell';
import { CommandMenu } from './command-menu';
import { useShell } from './shell-store';
import { UserMenu } from './user-menu';

// Time zone name (CET/CEST) is derived by Intl, never hard-coded.
const clockFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  timeZoneName: 'short',
});

function useClock(): string {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return clockFormat.format(now);
}

export function Topbar() {
  const { t } = useTranslation();
  const { toggleCollapsed, setMobileOpen } = useShell();
  const clock = useClock();

  return (
    <header className="sticky top-0 z-20 flex h-[var(--topbar-height)] shrink-0 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur md:px-6">
      <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} aria-label={t('nav.openMenu')} className="lg:hidden">
        <Menu aria-hidden />
      </Button>
      <Button variant="ghost" size="icon" onClick={toggleCollapsed} aria-label={t('nav.collapse')} className="hidden lg:inline-flex">
        <Menu aria-hidden />
      </Button>

      <div className="min-w-0 flex-1">
        <CommandMenu />
      </div>

      <span className="hidden text-sm text-muted-foreground tabular-nums md:inline" aria-hidden>
        {clock}
      </span>
      <ThemeToggle />
      <AlertsBell />
      <UserMenu />
    </header>
  );
}
