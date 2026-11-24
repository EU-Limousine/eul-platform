'use client';

import { useState, type FormEvent } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { CreateEnquiryDto } from '@eul/api-client';
import { isLocale } from '@eul/i18n';
import { Turnstile, turnstileEnabled } from './turnstile';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[0-9 ()-]{6,20}$/;
const REFERENCE = /^EUL-[A-Z0-9]{4,10}$/i;

type Field = 'name' | 'email' | 'phone' | 'company' | 'bookingReference' | 'message';
type Values = Record<Field, string> & { volume: string; website: string };
const EMPTY: Values = { name: '', email: '', phone: '', company: '', bookingReference: '', message: '', volume: '', website: '' };

const fieldClass =
  'w-full rounded-control border border-border bg-site-card px-3 py-3 text-base text-text aria-[invalid=true]:border-danger';

/**
 * Contact / business / event-and-group form → POST /public/enquiries.
 * Staff get an email; nothing is promised automatically. The API validates everything again.
 */
export function EnquiryForm({ type, topic }: { type: CreateEnquiryDto['type']; topic?: string }) {
  const t = useTranslations('pages.enquiry');
  const locale = useLocale();
  const [v, setV] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [token, setToken] = useState('');
  const [resetKey, setResetKey] = useState(0);

  const business = type === 'BUSINESS';
  const general = type === 'GENERAL';
  const set = (patch: Partial<Values>) => setV((prev) => ({ ...prev, ...patch }));

  function validate(): Partial<Record<Field, string>> {
    const e: Partial<Record<Field, string>> = {};
    if (v.name.trim().length < 2) e.name = t('errors.name');
    if (!EMAIL.test(v.email.trim())) e.email = t('errors.email');
    if (v.phone.trim() && !PHONE.test(v.phone.trim())) e.phone = t('errors.phone');
    if (business && v.company.trim().length < 2) e.company = t('errors.company');
    if (v.bookingReference.trim() && !REFERENCE.test(v.bookingReference.trim())) e.bookingReference = t('errors.reference');
    if (v.message.trim().length < 10) e.message = t('errors.message');
    return e;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    if (turnstileEnabled && !token) {
      setFormError(t('errors.botCheck'));
      return;
    }

    const message = business && v.volume ? `${t('volume')}: ${t(`volumes.${v.volume}`)}\n\n${v.message.trim()}` : v.message.trim();
    const body: CreateEnquiryDto = {
      type,
      name: v.name.trim(),
      email: v.email.trim(),
      phone: v.phone.trim() || undefined,
      company: v.company.trim() || undefined,
      bookingReference: v.bookingReference.trim() || undefined,
      topic,
      message,
      language: isLocale(locale) ? locale : 'en',
      website: v.website || undefined,
    };

    setSending(true);
    try {
      const res = await fetch(`${API_URL}/public/enquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'x-turnstile-token': token } : {}) },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setSent(true);
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { fieldErrors?: Record<string, string[]> };
      if (res.status === 422 && data.fieldErrors) {
        const mapped: Partial<Record<Field, string>> = {};
        for (const key of Object.keys(data.fieldErrors)) if (key in EMPTY) mapped[key as Field] = t('errors.check');
        setErrors(mapped);
      }
      setFormError(res.status === 429 ? t('errors.tooMany') : res.status === 403 ? t('errors.botCheck') : t('errors.generic'));
      setResetKey((k) => k + 1);
    } catch {
      setFormError(t('errors.network'));
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div role="status" className="rounded-card border border-border bg-site-card p-6">
        <CheckCircle2 aria-hidden className="text-success" size={28} />
        <h3 className="mt-3 font-display text-xl text-text">{t('sentTitle')}</h3>
        <p className="mt-2 text-sm text-text-muted">{t('sentText')}</p>
      </div>
    );
  }

  const input = (key: Field, label: string, opts: { type?: string; autoComplete?: string; optional?: boolean } = {}) => (
    <div className="space-y-1.5">
      <label htmlFor={`enq-${key}`} className="block text-sm font-medium text-text">
        {label}
        {opts.optional && <span className="font-normal text-text-muted"> ({t('optional')})</span>}
      </label>
      <input
        id={`enq-${key}`}
        type={opts.type ?? 'text'}
        autoComplete={opts.autoComplete}
        value={v[key]}
        onChange={(e) => set({ [key]: e.target.value } as Partial<Values>)}
        aria-invalid={!!errors[key]}
        aria-describedby={errors[key] ? `enq-${key}-error` : undefined}
        className={fieldClass}
      />
      {errors[key] && <p id={`enq-${key}-error`} role="alert" className="text-sm text-danger">{errors[key]}</p>}
    </div>
  );

  return (
    <form noValidate onSubmit={(e) => void submit(e)} className="relative space-y-4 rounded-card border border-border bg-site-card p-6">
      {business && input('company', t('company'), { autoComplete: 'organization' })}
      <div className="grid gap-4 sm:grid-cols-2">
        {input('name', t('name'), { autoComplete: 'name' })}
        {input('email', t('email'), { type: 'email', autoComplete: 'email' })}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {input('phone', t('phone'), { type: 'tel', autoComplete: 'tel', optional: true })}
        {general && input('bookingReference', t('reference'), { optional: true })}
        {business && (
          <div className="space-y-1.5">
            <label htmlFor="enq-volume" className="block text-sm font-medium text-text">
              {t('volume')} <span className="font-normal text-text-muted">({t('optional')})</span>
            </label>
            <select id="enq-volume" value={v.volume} onChange={(e) => set({ volume: e.target.value })} className={fieldClass}>
              <option value="">{t('volumes.choose')}</option>
              {(['few', 'some', 'many'] as const).map((k) => (
                <option key={k} value={k}>{t(`volumes.${k}`)}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="space-y-1.5">
        <label htmlFor="enq-message" className="block text-sm font-medium text-text">{t('message')}</label>
        <textarea
          id="enq-message"
          rows={5}
          maxLength={4000}
          value={v.message}
          placeholder={t(`placeholders.${type}`)}
          onChange={(e) => set({ message: e.target.value })}
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? 'enq-message-error' : undefined}
          className={fieldClass}
        />
        {errors.message && <p id="enq-message-error" role="alert" className="text-sm text-danger">{errors.message}</p>}
      </div>

      {/* Honeypot: hidden from people and screen readers; bots fill it. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 overflow-hidden">
        <label htmlFor="enq-website">Website</label>
        <input id="enq-website" tabIndex={-1} autoComplete="off" value={v.website} onChange={(e) => set({ website: e.target.value })} />
      </div>

      <Turnstile onToken={setToken} resetKey={resetKey} language={locale} />

      {formError && (
        <p role="alert" className="rounded-control bg-danger-bg px-4 py-3 text-sm text-text">{formError}</p>
      )}

      <p className="text-xs text-text-muted">{t('privacy')}</p>
      <button
        type="submit"
        disabled={sending}
        className="w-full rounded-control bg-site-dark px-5 py-3.5 text-base font-medium text-site-on-dark disabled:opacity-50 sm:w-auto"
      >
        {sending ? t('sending') : t('send')}
      </button>
    </form>
  );
}
