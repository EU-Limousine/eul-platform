import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ArrowLink, Container, SectionHeading } from '../ui';
import { SERVICE_ICONS, SERVICE_IMAGES, SERVICE_KEYS, type ServiceKey } from './content';

/** Option 1: photo cards (the services that have a photo, max 4). */
export function ServicesPhotoCards() {
  const t = useTranslations('home.services');
  const keys = SERVICE_KEYS.filter((k) => SERVICE_IMAGES[k]).slice(0, 4);
  return (
    <section id="services" className="scroll-mt-24 bg-site-surface py-20">
      <Container>
        <SectionHeading eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} action={<ArrowLink href="/book">{t('bookCta')}</ArrowLink>} />
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {keys.map((key) => (
            <ServicePhotoCard key={key} serviceKey={key} />
          ))}
        </ul>
      </Container>
    </section>
  );
}

function ServicePhotoCard({ serviceKey }: { serviceKey: ServiceKey }) {
  const t = useTranslations('home.services');
  const Icon = SERVICE_ICONS[serviceKey];
  const image = SERVICE_IMAGES[serviceKey];
  return (
    <li className="flex flex-col overflow-hidden rounded-card border border-border bg-site-card">
      {image && (
        <div className="relative aspect-[16/9]">
          <Image src={image} alt="" fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="flex items-center gap-2 font-display text-lg text-text">
          <Icon size={20} strokeWidth={1.6} aria-hidden className="text-site-gold-text" />
          {t(`items.${serviceKey}.title`)}
        </h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-text-muted">{t(`items.${serviceKey}.text`)}</p>
        <div className="mt-4">
          <ArrowLink href="/book">{t('bookCta')}</ArrowLink>
        </div>
      </div>
    </li>
  );
}

/** Option 2: six dark tiles with gold icons. */
export function ServicesDarkTiles() {
  const t = useTranslations('home.services');
  return (
    <section id="services" className="scroll-mt-24 bg-site-surface py-20">
      <Container>
        <SectionHeading eyebrow={t('eyebrow')} title={t('titleNoir')} />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {SERVICE_KEYS.map((key) => {
            const Icon = SERVICE_ICONS[key];
            return (
              <li key={key} className="flex flex-col items-center rounded-card bg-site-dark p-6 text-center text-site-on-dark">
                <Icon size={34} strokeWidth={1.3} aria-hidden className="text-site-gold" />
                <h3 className="mt-4 font-medium">{t(`items.${key}.title`)}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-site-on-dark-muted">{t(`items.${key}.short`)}</p>
                <div className="mt-4">
                  <ArrowLink href="/book" tone="dark">{t('bookCta')}</ArrowLink>
                </div>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
