import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TIME_ZONE } from '@eul/i18n';
import { useAuthStore } from '@/features/auth/auth-store';
import { logout } from '@/features/auth/session';

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
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clock = useClock();

  async function onLogout() {
    await logout();
    await navigate({ to: '/login' });
  }

  return (
    <header className="flex h-[var(--topbar-height)] items-center justify-end gap-6 bg-navy-950 px-6 text-on-dark">
      <span className="tabular-nums text-sm text-on-dark-muted" aria-hidden>
        {clock}
      </span>
      <span className="text-sm">{user?.name}</span>
      <button
        type="button"
        onClick={onLogout}
        aria-label={t('nav.logout')}
        className="rounded-control p-2 text-on-dark-muted hover:bg-navy-700 hover:text-on-dark"
      >
        <LogOut size={18} aria-hidden />
      </button>
    </header>
  );
}
