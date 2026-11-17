import { useTranslations } from 'next-intl';
import { Container } from '../ui';
import { FEATURE_ICONS, FEATURE_KEYS } from './content';

/** "Why choose us". classic = title left + 2 columns; noir = six bordered tiles. */
export function WhyChoose({ variant }: { variant: 'classic' | 'noir' }) {
  const t = useTranslations('home.why');
  const noir = variant === 'noir';

  return (
    <section className="bg-site-dark py-16 text-site-on-dark">
      <Container className={noir ? '' : 'grid gap-10 lg:grid-cols-[1fr_2fr] lg:items-center'}>
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-site-gold uppercase">{t('eyebrow')}</p>
          <h2 className="mt-2 font-display text-3xl leading-tight sm:text-4xl">{noir ? t('titleNoir') : t('title')}</h2>
        </div>
        <ul className={noir ? 'mt-8 grid gap-px overflow-hidden rounded-card bg-site-line-dark sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6' : 'grid gap-x-10 gap-y-7 sm:grid-cols-2'}>
          {FEATURE_KEYS.map((key) => {
            const Icon = FEATURE_ICONS[key];
            return (
              <li key={key} className={noir ? 'flex gap-3 bg-site-dark-2 p-5' : 'flex gap-4'}>
                <Icon size={noir ? 26 : 32} strokeWidth={1.3} aria-hidden className="shrink-0 text-site-gold" />
                <span>
                  <span className={`block font-medium ${noir ? 'text-site-gold' : 'text-site-on-dark'}`}>{t(`items.${key}.title`)}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-site-on-dark-muted">{t(`items.${key}.text`)}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
