import { Phone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Suspense } from 'react';
import { COMPANY } from '@/config/site';
import { Link } from '@/i18n/navigation';
import { LanguageSwitcher } from './language-switcher';
import { Logo } from './logo';
import { MobileMenu } from './mobile-menu';
import { Container } from './ui';

/** Main menu (the logo links home). */
export const NAV_ITEMS = [
  { href: '/services', key: 'services' },
  { href: '/business', key: 'business' },
  { href: '/fleet', key: 'fleet' },
  { href: '/about', key: 'about' },
  { href: '/contact', key: 'contact' },
] as const;

export function SiteHeader() {
  const t = useTranslations('header');
  const links = NAV_ITEMS.map((item) => ({ href: item.href, label: t(`nav.${item.key}`) }));

  return (
    <header className="sticky top-0 z-40 border-b border-site-line-dark bg-site-dark text-site-on-dark">
      <Container className="flex h-20 items-center justify-between gap-6">
        <Logo />

        <nav aria-label={t('menu')} className="hidden lg:block">
          <ul className="flex items-center gap-8 text-sm">
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-site-on-dark/90 transition hover:text-site-gold">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-3 sm:gap-5">
          {COMPANY.phone && (
            <a href={`tel:${COMPANY.phone.replace(/\s/g, '')}`} className="hidden items-center gap-2 text-sm xl:flex">
              <Phone size={16} aria-hidden className="text-site-gold" /> {COMPANY.phone}
            </a>
          )}
          {/* Suspense: the switcher reads the query string (useSearchParams) */}
          <Suspense fallback={null}>
            <LanguageSwitcher />
          </Suspense>
          <Link href="/book" className="hidden rounded-control bg-site-gold px-5 py-2.5 text-sm font-semibold text-site-dark hover:brightness-105 sm:inline-block">
            {t('book')}
          </Link>
          <MobileMenu links={links} bookLabel={t('book')} menuLabel={t('menu')} closeLabel={t('close')} />
        </div>
      </Container>
    </header>
  );
}
