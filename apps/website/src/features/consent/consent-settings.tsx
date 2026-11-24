'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { NONE, type ConsentCategory, type ConsentChoices } from './consent';

interface Props {
  enabled: readonly ConsentCategory[];
  initial: ConsentChoices | undefined;
  onSave: (choices: Partial<ConsentChoices>) => void;
  onAcceptAll: () => void;
  onClose: () => void;
}

/** Second layer: one switch per category the site uses. Optional ones start OFF. */
export function ConsentSettings({ enabled, initial, onSave, onAcceptAll, onClose }: Props) {
  const t = useTranslations('consent');
  const ref = useRef<HTMLDialogElement>(null);
  const [choices, setChoices] = useState<ConsentChoices>(initial ?? NONE);

  // Native modal dialog: focus trap, Esc and backdrop handled by the browser.
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby="consent-settings-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-auto w-[min(560px,94vw)] rounded-card bg-site-card p-0 text-text shadow-2xl backdrop:bg-black/60"
    >
      <div className="max-h-[85vh] overflow-y-auto p-6">
        <h2 id="consent-settings-title" className="font-display text-2xl">
          {t('settingsTitle')}
        </h2>
        <p className="mt-2 text-sm text-text-muted">{t('settingsText')}</p>

        <ul className="mt-5 divide-y divide-border rounded-control border border-border">
          <li className="flex items-start justify-between gap-4 p-4">
            <div>
              <p className="font-semibold">{t('categories.necessary.title')}</p>
              <p className="mt-1 text-sm text-text-muted">{t('categories.necessary.text')}</p>
            </div>
            <span className="shrink-0 text-sm font-semibold text-text-muted">{t('alwaysOn')}</span>
          </li>
          {enabled.map((category) => (
            <li key={category} className="flex items-start justify-between gap-4 p-4">
              <div>
                <label htmlFor={`consent-${category}`} className="font-semibold">
                  {t(`categories.${category}.title`)}
                </label>
                <p id={`consent-${category}-text`} className="mt-1 text-sm text-text-muted">
                  {t(`categories.${category}.text`)}
                </p>
              </div>
              <input
                id={`consent-${category}`}
                type="checkbox"
                role="switch"
                aria-describedby={`consent-${category}-text`}
                checked={choices[category]}
                onChange={(e) => setChoices({ ...choices, [category]: e.target.checked })}
                className="mt-1 h-6 w-6 shrink-0 accent-site-gold-strong"
              />
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => onSave(choices)}
            className="inline-flex min-h-11 items-center justify-center rounded-control border border-border px-5 text-sm font-semibold hover:bg-site-surface"
          >
            {t('save')}
          </button>
          <button type="button" onClick={onAcceptAll} className="inline-flex min-h-11 items-center justify-center rounded-control bg-site-dark px-5 text-sm font-semibold text-site-on-dark transition hover:brightness-110">
            {t('acceptAll')}
          </button>
        </div>
      </div>
    </dialog>
  );
}
