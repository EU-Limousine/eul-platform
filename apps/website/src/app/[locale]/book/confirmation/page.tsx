import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { BookingConfirmation } from '@/features/booking/booking-confirmation';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'booking.confirmation' });
  return { title: t('title'), robots: { index: false, follow: false } };
}

export default async function ConfirmationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <main className="min-h-[70vh] bg-site-surface">
      <Suspense fallback={null}>
        <BookingConfirmation />
      </Suspense>
    </main>
  );
}
