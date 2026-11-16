import { Mail, MapPin, Phone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { COMPANY } from '@/config/site';
import { Link } from '@/i18n/navigation';
import { SERVICE_KEYS } from './home/content';
import { LEGAL_PAGES } from './legal-pages';
import { Logo } from './logo';
import { Container } from './ui';

const SOCIAL_LABELS: Record<keyof typeof COMPANY.social, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  x: 'X',
};

/**
 * Site footer (both homepage options). Company facts come from config/site.ts:
 * empty values are hidden, and a visible placeholder reminds you to fill them in before launch.
 */
export function SiteFooter() {
  const t = useTranslations('footer');
  const nav = useTranslations('header.nav');
  const services = useTranslations('home.services.items');
  const legal = useTranslations('legal');
  const socials = (Object.keys(COMPANY.social) as (keyof typeof COMPANY.social)[]).filter((k) => COMPANY.social[k]);
  const hasContact = COMPANY.phone || COMPANY.email || COMPANY.address;

  return (
    <footer id="contact" className="bg-site-dark text-sm text-site-on-dark-muted">
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1.3fr]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs leading-relaxed">{t('tagline')}</p>
          {socials.length > 0 && (
            <ul className="flex flex-wrap gap-3">
              {socials.map((k) => (
                <li key={k}>
                  <a href={COMPANY.social[k]} target="_blank" rel="noopener noreferrer" className="rounded-full border border-site-line-dark px-3 py-1 text-xs hover:text-site-gold">
                    {SOCIAL_LABELS[k]}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <FooterColumn title={t('quickLinks')}>
          {(['home', 'services', 'fleet', 'about'] as const).map((key) => (
            <li key={key}>
              <Link href={key === 'home' ? '/' : `/#${key}`} className="hover:text-site-gold">{nav(key)}</Link>
            </li>
          ))}
          <li><Link href="/book" className="hover:text-site-gold">{t('bookOnline')}</Link></li>
        </FooterColumn>

        <FooterColumn title={t('services')}>
          {SERVICE_KEYS.map((key) => (
            <li key={key}>
              <Link href="/#services" className="hover:text-site-gold">{services(`${key}.title`)}</Link>
            </li>
          ))}
        </FooterColumn>

        <FooterColumn title={legal('nav')}>
          {LEGAL_PAGES.map((page) => (
            <li key={page}>
              <Link href={`/legal/${page}`} className="hover:text-site-gold">{legal(`titles.${page}`)}</Link>
            </li>
          ))}
        </FooterColumn>

        <FooterColumn title={t('contactUs')}>
          {COMPANY.phone && (
            <li className="flex gap-2"><Phone size={16} aria-hidden className="mt-0.5 shrink-0 text-site-gold" /><a href={`tel:${COMPANY.phone.replace(/\s/g, '')}`} className="hover:text-site-gold">{COMPANY.phone}</a></li>
          )}
          {COMPANY.email && (
            <li className="flex gap-2"><Mail size={16} aria-hidden className="mt-0.5 shrink-0 text-site-gold" /><a href={`mailto:${COMPANY.email}`} className="hover:text-site-gold">{COMPANY.email}</a></li>
          )}
          {COMPANY.address && (
            <li className="flex gap-2"><MapPin size={16} aria-hidden className="mt-0.5 shrink-0 text-site-gold" /><span>{COMPANY.address}</span></li>
          )}
          {COMPANY.mapsUrl && (
            <li>
              <a href={COMPANY.mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block rounded-full border border-site-gold px-4 py-1.5 text-site-on-dark hover:bg-site-dark-3">
                {t('directions')}
              </a>
            </li>
          )}
          {/* TODO(content): set phone, email and address in src/config/site.ts */}
          {!hasContact && <li className="text-site-on-dark-muted/80">{t('contactTodo')}</li>}
        </FooterColumn>
      </Container>

      <div className="border-t border-site-line-dark">
        <Container className="flex flex-wrap items-center justify-between gap-3 py-5 text-xs">
          <p>{t('rights', { year: new Date().getFullYear() })}</p>
          <p className="flex gap-5">
            <Link href="/legal/privacy" className="hover:text-site-gold">{legal('titles.privacy')}</Link>
            <Link href="/legal/terms" className="hover:text-site-gold">{legal('titles.terms')}</Link>
          </p>
        </Container>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="mb-4 text-sm font-semibold text-site-on-dark">{title}</h2>
      <ul className="space-y-2.5">{children}</ul>
    </div>
  );
}
