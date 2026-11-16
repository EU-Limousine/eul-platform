import { useTranslations } from 'next-intl';

export const STEPS = ['journey', 'vehicle', 'details', 'payment'] as const;
export type Step = (typeof STEPS)[number];

/** journey → vehicle → details → payment → confirmation (D-18). Confirmation is its own page. */
export function BookingStepper({ current }: { current: Step }) {
  const t = useTranslations('booking.steps');
  const index = STEPS.indexOf(current);
  return (
    <ol className="flex items-center gap-2 text-xs sm:text-sm" aria-label={t('label')}>
      {[...STEPS, 'confirmation' as const].map((step, i) => {
        const state = i < index ? 'done' : i === index ? 'current' : 'todo';
        return (
          <li key={step} className="flex flex-1 flex-col gap-1.5" aria-current={state === 'current' ? 'step' : undefined}>
            <span className={`h-1 rounded-full ${state === 'todo' ? 'bg-border' : 'bg-brand-black'}`} />
            <span className={state === 'todo' ? 'text-text-muted' : 'font-medium text-text'}>
              <span className="sr-only">{t('stepOf', { step: i + 1, total: STEPS.length + 1 })} </span>
              {t(step)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
