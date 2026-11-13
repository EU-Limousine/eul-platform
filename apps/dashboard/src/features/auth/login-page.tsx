import { useState, type FormEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ApiError } from '@eul/api-client';
import { login } from './session';

// TODO(design): rebuild from the login HTML design in designs/ once it is added.
export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <main className="flex min-h-full items-center justify-center bg-navy-900 px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-card bg-surface p-8 shadow-xl"
        aria-describedby={error ? 'login-error' : undefined}
      >
        <p className="text-sm font-medium tracking-widest text-text-muted uppercase">{t('brand')}</p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-text">{t('login.title')}</h1>
        <p className="mt-1 text-sm text-text-muted">{t('login.subtitle')}</p>

        <label className="mt-6 block text-sm font-medium" htmlFor="email">
          {t('login.email')}
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-control border border-border px-3 py-2"
        />

        <label className="mt-4 block text-sm font-medium" htmlFor="password">
          {t('login.password')}
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-control border border-border px-3 py-2"
        />

        {error && (
          <p id="login-error" role="alert" className="mt-4 rounded-control bg-danger-bg px-3 py-2 text-sm text-text">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-control bg-navy-900 px-4 py-2 font-medium text-on-dark disabled:opacity-60"
        >
          {submitting ? t('login.submitting') : t('login.submit')}
        </button>
      </form>
    </main>
  );
}
