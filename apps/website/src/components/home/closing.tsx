import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Container, GoldLink, OutlineLink, SectionHeading } from '../ui';
import { GALLERY } from './content';
import { PartnerLogos } from './social-proof';

/** Option 1: photo strip ("Journeys that make an impression"). */
export function Gallery() {
  const t = useTranslations('home.gallery');
  if (GALLERY.length === 0) return null;
  return (
    <section className="bg-site-surface pb-20">
      <Container>
        <SectionHeading eyebrow={t('eyebrow')} title={t('title')} />
        <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {GALLERY.map((src) => (
            <li key={src} className="relative aspect-[5/2] overflow-hidden rounded-card">
              <Image src={src} alt="" fill sizes="(min-width: 1024px) 20vw, 50vw" className="object-cover transition duration-500 hover:scale-105" />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

/** Option 1: closing call to action band. */
export function CtaClassic() {
  const t = useTranslations('home.cta');
  return (
    <section className="border-b border-site-line-dark bg-site-dark-2 text-site-on-dark">
      <Container className="flex flex-col gap-6 py-12 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl">
          <h2 className="font-display text-3xl">{t('title')}</h2>
          <p className="mt-2 text-site-on-dark-muted">{t('text')}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <GoldLink href="/book">
            {t('primary')} <ArrowRight size={16} aria-hidden />
          </GoldLink>
          <OutlineLink href="/book">{t('secondary')}</OutlineLink>
        </div>
      </Container>
    </section>
  );
}

/** Option 2: partners (if any, with permission) + call to action on one dark band. */
export function CtaNoir() {
  const t = useTranslations('home.cta');
  return (
    <section className="border-b border-site-line-dark bg-site-dark-2 text-site-on-dark">
      <Container className="flex flex-col gap-8 py-14 lg:flex-row lg:items-center lg:justify-between">
        <PartnerLogos />
        <div className="flex flex-col gap-6 lg:items-end">
          <h2 className="font-display text-3xl lg:text-right">{t('title')}</h2>
          <div className="flex flex-wrap gap-3">
            <GoldLink href="/book">
              {t('primaryNoir')} <ArrowRight size={16} aria-hidden />
            </GoldLink>
            <OutlineLink href="/#contact">{t('contact')}</OutlineLink>
          </div>
        </div>
      </Container>
    </section>
  );
}
