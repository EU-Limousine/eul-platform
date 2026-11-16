import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Container, SectionHeading } from '../ui';
import { IMAGES, STEP_ICONS, STEP_KEYS } from './content';

/**
 * The real booking flow: book → pay (booking received) → chauffeur confirmed → ride.
 * "classic" = Option 1 (steps + photo), "noir" = Option 2 (numbered gold circles).
 */
export function HowItWorks({ variant }: { variant: 'classic' | 'noir' }) {
  const t = useTranslations('home.how');
  const noir = variant === 'noir';

  const steps = (
    <ol className={`mt-10 grid gap-8 sm:grid-cols-2 ${noir ? 'lg:grid-cols-4' : 'xl:grid-cols-4'}`}>
      {STEP_KEYS.map((key, i) => {
        const Icon = STEP_ICONS[key];
        return (
          <li key={key} className="relative flex gap-4">
            <span
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${
                noir ? 'bg-site-gold text-site-dark' : 'border border-border bg-site-card text-text'
              }`}
            >
              <Icon size={22} strokeWidth={1.6} aria-hidden />
            </span>
            <span>
              {noir && <span className="block text-xs font-semibold text-text-muted tabular-nums">{String(i + 1).padStart(2, '0')}</span>}
              <span className="block font-display text-lg text-text">
                {noir ? '' : `${i + 1}. `}
                {t(`steps.${key}.title`)}
              </span>
              <span className="mt-1 block text-sm leading-relaxed text-text-muted">{t(`steps.${key}.text`)}</span>
            </span>
            {!noir && i < STEP_KEYS.length - 1 && (
              <ArrowRight size={18} aria-hidden className="absolute top-5 -right-6 hidden text-text-muted xl:block" />
            )}
          </li>
        );
      })}
    </ol>
  );

  return (
    <section className="bg-site-surface py-20">
      <Container className={noir ? '' : 'grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:items-center'}>
        <div>
          <SectionHeading eyebrow={t('eyebrow')} title={noir ? t('titleNoir') : t('title')} subtitle={noir ? undefined : t('subtitle')} />
          {steps}
        </div>
        {!noir && (
          <div className="relative hidden aspect-[16/9] overflow-hidden rounded-card lg:block">
            <Image src={IMAGES.classicHow} alt="" fill sizes="35vw" className="object-cover" />
          </div>
        )}
      </Container>
    </section>
  );
}
