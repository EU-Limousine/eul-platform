import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/shared/lib/theme';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/shadcn/button';

/** Light by default, dark on toggle. */
export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { theme, toggle } = useTheme();
  const label = theme === 'dark' ? t('theme.toLight') : t('theme.toDark');
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label={label} title={label} className={cn(className)}>
      {theme === 'dark' ? <Sun aria-hidden /> : <Moon aria-hidden />}
    </Button>
  );
}
