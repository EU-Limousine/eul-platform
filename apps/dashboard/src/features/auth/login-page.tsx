import { useTranslation } from 'react-i18next';
import { ThemeToggle } from '@/shared/ui/theme-toggle';
import { LoginForm } from './login-form';
import { LoginHero } from './login-hero';

/** Split screen from the login design: photo + welcome on the left, sign-in card on the right. */
export function LoginPage() {
  const { t } = useTranslation();
  return (
    <main className="grid min-h-full bg-background lg:grid-cols-[1.1fr_1fr]">
      <LoginHero />
      <div className="relative flex flex-col items-center justify-center px-4 py-12">
        <ThemeToggle className="absolute top-4 right-4" />
        <LoginForm />
        <p className="absolute right-6 bottom-4 text-xs text-muted-foreground">{t('login.footer')}</p>
      </div>
    </main>
  );
}
