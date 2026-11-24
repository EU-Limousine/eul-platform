import Image from 'next/image';
import { Luggage, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { PublicCategoryDto } from '@eul/api-client';
import { ArrowLink, Container, SectionHeading } from '../ui';
import { fleetImage } from './content';

const formatFrom = (minor: number, currency: string, locale: string) =>
  new Intl.NumberFormat(locale === 'en' ? 'en-GB' : locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(minor / 100);

/**
 * Vehicle classes come live from the dashboard (Vehicles → classes). A "from" price only
 * appears when management has marked that price Confirmed. No classes → section hidden.
 */
export function FleetGrid({ categories, locale, variant }: { categories: PublicCategoryDto[]; locale: string; variant: 'classic' | 'noir' }) {
  const t = useTranslations('home.fleet');
  if (categories.length === 0) return null;
  const noir = variant === 'noir';
  const shown = categories.slice(0, 4);

  return (
    <section id="fleet" className="scroll-mt-24 bg-site-surface py-20">
      <Container>
        <SectionHeading
          eyebrow={t('eyebrow')}
          title={noir ? t('titleNoir') : t('title')}
          subtitle={noir ? undefined : t('subtitle')}
          action={<ArrowLink href="/book">{t('cta')}</ArrowLink>}
        />
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {shown.map((c) => (
            <VehicleCard key={c.id} category={c} locale={locale} noir={noir} />
          ))}
        </ul>
      </Container>
    </section>
  );
}

/** One vehicle class (photo, name, example model, seats, luggage, confirmed "from" price). Also used on the Fleet and service pages. */
export function VehicleCard({ category: c, locale, noir = false }: { category: PublicCategoryDto; locale: string; noir?: boolean }) {
  const t = useTranslations('home.fleet');
  return (
    <li className="overflow-hidden rounded-card border border-border bg-site-card">
      <div className={`relative aspect-[16/8] ${noir ? 'bg-site-dark' : 'bg-site-warm'}`}>
        <Image src={fleetImage(c.code)} alt="" fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
      </div>
      <div className="p-5">
        <h3 className="font-display text-lg text-text">{c.name}</h3>
        {c.exampleModel && <p className="text-sm text-text-muted">{t('orSimilar', { model: c.exampleModel })}</p>}
        <p className="mt-3 flex flex-wrap gap-4 text-sm text-text-muted">
          <span className="inline-flex items-center gap-1.5"><Users size={15} aria-hidden /> {t('seats', { count: c.maxPassengers })}</span>
          {c.luggageNote && <span className="inline-flex items-center gap-1.5"><Luggage size={15} aria-hidden /> {c.luggageNote}</span>}
        </p>
        {c.fromPriceMinor != null && c.currency && (
          <p className="mt-3 text-sm text-text">
            {t('from')} <span className="font-semibold tabular-nums">{formatFrom(c.fromPriceMinor, c.currency, locale)}</span>
          </p>
        )}
      </div>
    </li>
  );
}
