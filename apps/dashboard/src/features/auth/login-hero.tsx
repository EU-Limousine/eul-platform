import { Car, type LucideIcon, Radio, ScrollText, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BrandLogo } from '@/shared/ui/brand-logo';

// TODO(content): placeholder photo cropped from the login design; replace with a real fleet photo.
const PHOTO = '/brand/login-car.webp';

const FEATURES: { icon: LucideIcon; key: string }[] = [
  { icon: ShieldCheck, key: 'secure' },
  { icon: Radio, key: 'dispatch' },
  { icon: Car, key: 'fleet' },
  { icon: ScrollText, key: 'audit' },
];

/** Left half of the login screen. Always dark (it sits on a night photo), in both themes. */
export function LoginHero() {
  const { t } = useTranslation();
  return (
    <section className="relative hidden flex-col overflow-hidden bg-navy-950 p-10 text-on-dark lg:flex">
      <img src={PHOTO} alt="" aria-hidden className="absolute inset-x-0 bottom-0 w-full object-cover opacity-90" />
      <div className="absolute inset-0 bg-gradient-to-b from-navy-950 via-navy-950/70 to-transparent" aria-hidden />

      <div className="relative">
        <BrandLogo className="w-48" />
        <p className="mt-14 text-xs font-medium tracking-[0.3em] text-gold uppercase">{t('login.hero.kicker')}</p>
        <h2 className="mt-3 font-display text-4xl leading-tight font-semibold">
          {t('brand')}
          <span className="block text-3xl font-normal text-on-dark-muted">{t('login.hero.title')}</span>
        </h2>
        <p className="mt-4 flex items-center gap-4 text-sm text-gold">
          {t('login.hero.tagline')}
          <span className="h-px w-16 bg-gold/60" aria-hidden />
        </p>

        <ul className="mt-10 flex divide-x divide-on-dark-muted/30">
          {FEATURES.map(({ icon: Icon, key }) => (
            <li key={key} className="flex w-28 flex-col items-center gap-2 px-2 text-center text-xs">
              <Icon size={26} className="text-gold" aria-hidden />
              {t(`login.hero.features.${key}`)}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
