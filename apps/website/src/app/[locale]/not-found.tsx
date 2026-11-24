import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Container, GoldLink, OutlineLink } from '@/components/ui';

/** 404 in the visitor's language, with a way home and a way to book. */
export default function NotFound() {
  const t = useTranslations('pages.errors');
  return (
    <main className="bg-site-dark text-site-on-dark">
      <Container className="py-24 text-center">
        <p className="text-xs font-semibold tracking-[0.18em] text-site-gold uppercase">404</p>
        <h1 className="mt-3 font-display text-4xl">{t('notFoundTitle')}</h1>
        <p className="mx-auto mt-4 max-w-md text-site-on-dark-muted">{t('notFoundText')}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <GoldLink href="/book">{t('book')} <ArrowRight size={16} aria-hidden /></GoldLink>
          <OutlineLink href="/">{t('home')}</OutlineLink>
        </div>
      </Container>
    </main>
  );
}
