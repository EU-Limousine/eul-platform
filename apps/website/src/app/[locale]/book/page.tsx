import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { BookingFlow } from '@/features/booking/booking-flow';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'booking' });
  // The booking flow is personal and step-based: keep it out of search results.
  return { title: t('title'), robots: { index: false, follow: true } };
}

export default async function BookPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <main className="min-h-[70vh] bg-surface">
      <Suspense fallback={null}>
        <BookingFlow />
      </Suspense>
    </main>
  );
}
