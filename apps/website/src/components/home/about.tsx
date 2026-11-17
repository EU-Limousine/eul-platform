import Image from 'next/image';
import { BadgeCheck, CalendarCheck, Car, Lock, MapPin, ShieldCheck, Star, Tag, Users, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Container } from '../ui';
import { ABOUT_POINTS, IMAGES, STATS, type StatKey } from './content';

const STAT_ICONS: Record<StatKey, LucideIcon> = { years: CalendarCheck, clients: Users, rides: Car, cities: MapPin, rating: Star };
const POINT_ICONS: Record<(typeof ABOUT_POINTS)[number], LucideIcon> = { discreet: Lock, chauffeurs: BadgeCheck, fixedPrice: Tag, online: ShieldCheck };

/** Option 1: photo left, story right, real stats in a column (hidden when STATS is empty). */
export function AboutClassic() {
  const t = useTranslations('home.about');
  const s = useTranslations('home.stats');
  return (
    <section id="about" className="scroll-mt-24 bg-site-warm">
      <div className="grid lg:grid-cols-[45%_1fr]">
        <div className="relative min-h-[280px]">
          <Image src={IMAGES.classicAbout} alt="" fill sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
        </div>
        <div className="grid gap-10 px-6 py-14 sm:px-12 lg:grid-cols-[1fr_auto] lg:py-16">
          <div className="max-w-xl">
            <p className="text-xs font-semibold tracking-[0.18em] text-site-gold-text uppercase">{t('eyebrow')}</p>
            <h2 className="mt-2 font-display text-3xl leading-tight text-text sm:text-4xl">{t('title')}</h2>
            <p className="mt-4 leading-relaxed text-text-muted">{t('text')}</p>
          </div>
          {STATS.length > 0 && (
            <dl className="space-y-5 border-border lg:border-l lg:pl-10">
              {STATS.map((stat) => (
                <div key={stat.key}>
                  <dt className="sr-only">{s(stat.key)}</dt>
                  <dd className="font-display text-3xl text-text tabular-nums">{stat.value}</dd>
                  <dd className="text-sm text-text-muted">{s(stat.key)}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </section>
  );
}

/** Option 2: story · photo · four short points. */
export function AboutNoir() {
  const t = useTranslations('home.about');
  const p = useTranslations('home.about.points');
  return (
    <section id="about" className="scroll-mt-24 bg-site-surface py-20">
      <Container className="grid gap-10 lg:grid-cols-[1fr_1.2fr_0.9fr] lg:items-center">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-site-gold-text uppercase">{t('eyebrowNoir')}</p>
          <h2 className="mt-2 font-display text-3xl leading-tight text-text sm:text-4xl">{t('titleNoir')}</h2>
          <p className="mt-4 leading-relaxed text-text-muted">{t('text')}</p>
        </div>
        <div className="relative aspect-[16/10] overflow-hidden rounded-card">
          <Image src={IMAGES.noirAbout} alt="" fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
        </div>
        <ul className="space-y-6">
          {ABOUT_POINTS.map((key) => {
            const Icon = POINT_ICONS[key];
            return (
              <li key={key} className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-site-gold">
                  <Icon size={18} strokeWidth={1.6} aria-hidden className="text-site-gold-text" />
                </span>
                <span>
                  <span className="block font-medium text-text">{p(`${key}.title`)}</span>
                  <span className="block text-sm text-text-muted">{p(`${key}.text`)}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}

/** Option 2: dark band of real numbers under the hero. Renders nothing while STATS is empty. */
export function StatsBand() {
  const s = useTranslations('home.stats');
  if (STATS.length === 0) return null;
  return (
    <section aria-label={s('label')} className="border-t border-site-line-dark bg-site-dark-2 py-10 text-site-on-dark">
      <Container>
        <dl className="grid grid-cols-2 gap-8 lg:grid-cols-4 lg:divide-x lg:divide-site-line-dark">
          {STATS.map((stat) => {
            const Icon = STAT_ICONS[stat.key];
            return (
              <div key={stat.key} className="flex flex-col items-center text-center">
                <Icon size={26} strokeWidth={1.4} aria-hidden className="text-site-gold" />
                <dt className="order-last text-sm text-site-on-dark-muted">{s(stat.key)}</dt>
                <dd className="mt-2 font-display text-3xl tabular-nums">{stat.value}</dd>
              </div>
            );
          })}
        </dl>
      </Container>
    </section>
  );
}
