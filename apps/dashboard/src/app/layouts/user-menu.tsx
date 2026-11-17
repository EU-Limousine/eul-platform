import { useNavigate } from '@tanstack/react-router';
import { ChevronDown, LogOut, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/features/auth/auth-store';
import { logout } from '@/features/auth/session';
import { useTheme } from '@/shared/lib/theme';
import { Avatar, AvatarFallback } from '@/shared/ui/shadcn/avatar';
import { Button } from '@/shared/ui/shadcn/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/shadcn/dropdown-menu';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '')).toUpperCase() || '?';
}

export function UserMenu() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { theme, toggle } = useTheme();
  if (!user) return null;

  const role = user.roles[0] ? t(`roles.${user.roles[0]}`, { defaultValue: user.roles[0] }) : '';

  async function onLogout() {
    await logout();
    await navigate({ to: '/login' });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-11 gap-3 px-2">
          <Avatar className="size-9">
            <AvatarFallback className="bg-primary/10 text-sm font-medium">{initials(user.name)}</AvatarFallback>
          </Avatar>
          <span className="hidden text-left leading-tight md:block">
            <span className="block text-sm font-medium">{user.name}</span>
            <span className="block text-xs text-muted-foreground">{role}</span>
          </span>
          <ChevronDown className="hidden text-muted-foreground md:block" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <span className="block text-sm font-medium">{user.name}</span>
          <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={toggle}>
          {theme === 'dark' ? <Sun aria-hidden /> : <Moon aria-hidden />}
          {theme === 'dark' ? t('theme.toLight') : t('theme.toDark')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void onLogout()}>
          <LogOut aria-hidden />
          {t('nav.logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
