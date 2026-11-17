import { useState, type FormEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Eye, EyeOff, Lock, LogIn, Mail, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '@eul/api-client';
import { BrandLogo } from '@/shared/ui/brand-logo';
import { Button } from '@/shared/ui/shadcn/button';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import { login } from './session';

export function LoginForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      await navigate({ to: '/' });
    } catch (err) {
      setError(err instanceof ApiError ? err.body.message : t('login.errorGeneric'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-md rounded-xl border bg-card p-8 shadow-xl sm:p-10"
      {...(error ? { 'aria-describedby': 'login-error' } : {})}
    >
      <BrandLogo className="mx-auto w-44" />
      <h1 className="mt-6 text-center font-display text-3xl font-semibold">{t('login.title')}</h1>
      <p className="mt-1 text-center text-sm text-muted-foreground">{t('login.subtitle')}</p>

      <div className="mt-8 space-y-2">
        <Label htmlFor="email">{t('login.email')}</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            id="email"
            type="email"
            autoComplete="username"
            required
            placeholder={t('login.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 pl-10"
          />
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <Label htmlFor="password">{t('login.password')}</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            placeholder={t('login.passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 pr-11 pl-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
            aria-pressed={showPassword}
            className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground"
          >
            {showPassword ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
          </Button>
        </div>
      </div>

      {/* No self-service reset yet: an administrator sets a new password. */}
      <p className="mt-3 text-right text-xs text-muted-foreground">{t('login.forgot')}</p>

      {error && (
        <p id="login-error" role="alert" className="mt-4 rounded-md bg-danger-bg px-3 py-2 text-sm">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={submitting}
        className="mt-6 h-11 w-full bg-gradient-to-r from-gold/75 via-gold to-gold/75 text-base text-navy-950 hover:opacity-90"
      >
        <LogIn aria-hidden />
        {submitting ? t('login.submitting') : t('login.submit')}
      </Button>

      <p className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="size-4" aria-hidden />
        {t('login.secureNote')}
      </p>
    </form>
  );
}
