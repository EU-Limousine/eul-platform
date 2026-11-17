import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { AlertTriangle, Car, Moon, Plus, Search, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCan } from '@/features/auth/can';
import { useTheme } from '@/shared/lib/theme';
import { Button } from '@/shared/ui/shadcn/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/shared/ui/shadcn/command';
import { useShell } from './shell-store';
import { useVisibleNavItems } from './sidebar';

/** "Search anything…" in the topbar: jump to screens and common actions (Ctrl/⌘ K). */
export function CommandMenu() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { searchOpen, setSearchOpen } = useShell();
  const toggleTheme = useTheme((s) => s.toggle);
  const items = useVisibleNavItems();
  const canBookings = useCan('bookings.read');
  const canWriteDrivers = useCan('drivers.write');
  const canWriteUsers = useCan('users.write');
  const canAddDriver = canWriteDrivers && canWriteUsers; // hooks always called, never conditionally
  const canAddVehicle = useCan('vehicles.write');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen(!useShell.getState().searchOpen);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setSearchOpen]);

  const run = (action: () => unknown) => {
    setSearchOpen(false);
    void action();
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setSearchOpen(true)}
        className="h-10 w-full max-w-xs justify-start gap-2 bg-card font-normal text-muted-foreground"
      >
        <Search aria-hidden />
        <span className="flex-1 text-left">{t('search.placeholder')}</span>
        <kbd className="hidden rounded border bg-muted px-1.5 text-[10px] font-medium sm:inline">Ctrl K</kbd>
      </Button>

      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen} title={t('search.title')} description={t('search.description')}>
        <CommandInput placeholder={t('search.input')} />
        <CommandList>
          <CommandEmpty>{t('search.empty')}</CommandEmpty>
          <CommandGroup heading={t('search.screens')}>
            {items.map((item) => (
              <CommandItem key={item.to} value={t(item.labelKey)} onSelect={() => run(() => navigate({ to: item.to }))}>
                <item.icon aria-hidden />
                {t(item.labelKey)}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading={t('search.actions')}>
            {canBookings && (
              <CommandItem
                value={t('quick.needsAttention')}
                onSelect={() => run(() => navigate({ to: '/bookings', search: { tab: 'attention' } }))}
              >
                <AlertTriangle aria-hidden />
                {t('quick.needsAttention')}
              </CommandItem>
            )}
            {canAddDriver && (
              <CommandItem value={t('drivers.add')} onSelect={() => run(() => navigate({ to: '/drivers', search: { new: true } }))}>
                <UserPlus aria-hidden />
                {t('drivers.add')}
              </CommandItem>
            )}
            {canAddVehicle && (
              <CommandItem value={t('vehicles.add')} onSelect={() => run(() => navigate({ to: '/vehicles', search: { new: true } }))}>
                <Car aria-hidden />
                <Plus aria-hidden className="-ml-1 size-3" />
                {t('vehicles.add')}
              </CommandItem>
            )}
            <CommandItem value={t('theme.toggle')} onSelect={() => run(toggleTheme)}>
              <Moon aria-hidden />
              {t('theme.toggle')}
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
