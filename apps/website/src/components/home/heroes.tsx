import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Container, GoldLink, OutlineLink } from '../ui';
import { HIGHLIGHT_ICONS, HIGHLIGHTS, IMAGES } from './content';
import { QuickBooking } from './quick-booking';

/** Small icon + two-line text items under the hero copy. */
function Highlights({ keys, divided = false }: { keys: readonly string[]; divided?: boolean }) {
  const t = useTranslations('home.highlights');
  return (
    <ul className={`mt-10 flex flex-wrap gap-x-8 gap-y-5 ${divided ? 'lg:divide-x lg:divide-site-line-dark' : ''}`}>
      {keys.map((key) => {
        const Icon = HIGHLIGHT_ICONS[key];
        return (
          <li key={key} className={`flex items-center gap-3 ${divided ? 'lg:pl-8 lg:first:pl-0' : ''}`}>
            {Icon && <Icon size={26} strokeWidth={1.5} aria-hidden className="text-site-gold" />}
            <span className="text-sm leading-tight">
              <span className="block font-medium text-site-on-dark">{t(`${key}.title`)}</span>
              <span className="block text-site-on-dark-muted">{t(`${key}.text`)}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Option 1: full-width photo hero, booking bar overlapping the next section. */
export function HeroClassic() {
  const t = useTranslations('home.hero.classic');
  return (
    <section className="bg-site-surface">
      <div className="relative overflow-hidden bg-site-dark text-site-on-dark">
        <Image src={IMAGES.classicHero} alt="" fill priority sizes="100vw" className="object-cover object-[75%_center]" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-site-dark via-site-dark/85 to-site-dark/10" />
        <Container className="relative pt-16 pb-36 sm:pt-24 lg:pb-40">
          <div className="max-w-xl">
            <p className="text-xs font-semibold tracking-[0.2em] text-site-gold uppercase">{t('eyebrow')}</p>
            <h1 className="mt-4 font-display text-4xl leading-[1.1] sm:text-5xl lg:text-6xl">{t('title')}</h1>
            <p className="mt-6 text-lg leading-relaxed text-site-on-dark-muted">{t('text')}</p>
            <Highlights keys={HIGHLIGHTS.classic} />
          </div>
        </Container>
      </div>
      <Container className="relative z-10 -mt-24 pb-6">
        <QuickBooking variant="bar" />
      </Container>
    </section>
  );
}

/** Option 2: dark hero with copy left and the booking card right. */
export function HeroNoir() {
  const t = useTranslations('home.hero.noir');
  return (
    <section className="relative overflow-hidden bg-site-dark text-site-on-dark">
      <Image src={IMAGES.noirHero} alt="" fill priority sizes="100vw" className="object-cover object-[60%_center] opacity-70" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-site-dark via-site-dark/70 to-site-dark/40" />
      <Container className="relative grid gap-10 py-14 lg:grid-cols-[1fr_420px] lg:items-center lg:py-20">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-site-gold uppercase">{t('eyebrow')}</p>
          <h1 className="mt-4 font-display text-4xl leading-[1.1] sm:text-5xl lg:text-6xl">
            <span className="block">{t('title1')}</span>
            <span className="block text-site-gold">{t('title2')}</span>
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-site-on-dark-muted">{t('text')}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <GoldLink href="/book">
              {t('primary')} <ArrowRight size={16} aria-hidden />
            </GoldLink>
            <OutlineLink href="/#services">{t('secondary')}</OutlineLink>
          </div>
          <Highlights keys={HIGHLIGHTS.noir} divided />
        </div>
        <QuickBooking variant="card" />
      </Container>
    </section>
  );
}
