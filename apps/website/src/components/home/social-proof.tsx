import Image from 'next/image';
import { Quote, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Container, SectionHeading } from '../ui';
import { PARTNERS, TESTIMONIALS } from './content';

/**
 * Real reviews only (content.ts → TESTIMONIALS). Renders nothing while the list is empty.
 * classic = left aligned with stars; noir = centred heading, gold quote marks.
 */
export function Testimonials({ variant }: { variant: 'classic' | 'noir' }) {
  const t = useTranslations('home.testimonials');
  if (TESTIMONIALS.length === 0) return null;
  const noir = variant === 'noir';

  return (
    <section className="bg-site-surface py-20">
      <Container>
        <SectionHeading
          eyebrow={t('eyebrow')}
          title={noir ? t('titleNoir') : t('title')}
          subtitle={noir ? undefined : t('subtitle')}
          align={noir ? 'center' : 'left'}
        />
        <ul className="mt-10 grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.slice(0, 3).map((r) => (
            <li key={r.name} className="flex flex-col rounded-card border border-border bg-site-card p-6">
              <Quote size={22} aria-hidden className="text-site-gold-text" />
              <blockquote className="mt-3 flex-1 leading-relaxed text-text">{r.quote}</blockquote>
              <div className="mt-5 flex items-center gap-3">
                {r.photo && <Image src={r.photo} alt="" width={44} height={44} className="h-11 w-11 rounded-full object-cover" />}
                <span className="text-sm">
                  <span className="block font-medium text-text">{r.name}</span>
                  {r.role && <span className="block text-text-muted">{r.role}</span>}
                  {r.rating && (
                    <span className="mt-1 flex gap-0.5" aria-label={t('rating', { rating: r.rating })}>
                      {Array.from({ length: r.rating }, (_, i) => (
                        <Star key={i} size={13} aria-hidden className="fill-site-gold-strong text-site-gold-strong" />
                      ))}
                    </span>
                  )}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

/** Partner logos (only with written permission). Renders nothing while PARTNERS is empty. */
export function PartnerLogos() {
  const t = useTranslations('home.partners');
  if (PARTNERS.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.18em] text-site-gold uppercase">{t('eyebrow')}</p>
      <h2 className="mt-2 font-display text-2xl text-site-on-dark">{t('title')}</h2>
      <ul className="mt-6 flex flex-wrap items-center gap-8">
        {PARTNERS.map((p) => (
          <li key={p.name}>
            <Image src={p.logo} alt={p.name} width={140} height={48} className="h-10 w-auto opacity-90" />
          </li>
        ))}
      </ul>
    </div>
  );
}
