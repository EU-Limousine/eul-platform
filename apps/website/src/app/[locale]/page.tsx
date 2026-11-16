import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { Link } from '@/i18n/navigation';

// TODO(design): build from the website home HTML design. TODO(content): real copy and images.
export default function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations('home');

  return (
    <main className="bg-brand-black text-on-dark">
      <section className="mx-auto flex min-h-[70vh] max-w-5xl flex-col justify-center px-6 py-24">
        <h1 className="text-4xl font-semibold md:text-6xl">{t('title')}</h1>
        <p className="mt-6 max-w-2xl text-lg text-on-dark-muted">{t('subtitle')}</p>
        <Link href="/book" className="mt-10 inline-block self-start rounded-control bg-brand-gold px-6 py-3.5 font-medium text-brand-black">
          {t('cta')}
        </Link>
      </section>
    </main>
  );
}
