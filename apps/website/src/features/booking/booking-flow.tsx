'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { BookingStepper, STEPS, type Step } from './booking-stepper';
import { selectedOption, useBookingDraft, type BookingDraft } from './draft';
import { StepDetails } from './step-details';
import { StepJourney } from './step-journey';
import { StepPayment } from './step-payment';
import { StepVehicle } from './step-vehicle';

/** Furthest step the draft allows (you can't open "payment" without a vehicle and details). */
function allowedStep(draft: BookingDraft, wanted: Step): Step {
  if (wanted === 'journey' || !draft.quote) return 'journey';
  if (wanted === 'vehicle' || !selectedOption(draft)) return 'vehicle';
  if (wanted === 'details' || !draft.details) return 'details';
  return 'payment';
}

/**
 * The booking flow (D-18): journey → vehicle → details → payment → confirmation.
 * The step is in the URL (?step=), so the language switcher keeps the customer on the same step.
 */
export function BookingFlow() {
  const t = useTranslations('booking');
  const router = useRouter();
  const params = useSearchParams();
  const { draft, update } = useBookingDraft();

  const requested = (STEPS as readonly string[]).includes(params.get('step') ?? '') ? (params.get('step') as Step) : 'journey';
  const step = draft ? allowedStep(draft, requested) : requested;

  const go = (next: Step) => {
    router.push(`/book?step=${next}`);
    window.scrollTo({ top: 0 });
  };

  // Fix the URL if it asked for a step the draft does not allow yet.
  useEffect(() => {
    if (draft && step !== requested) router.replace(`/book?step=${step}`);
  }, [draft, step, requested, router]);

  return (
    <div className="mx-auto max-w-2xl px-5 py-8 sm:py-12">
      <h1 className="sr-only">{t('title')}</h1>
      <BookingStepper current={step} />
      <div className="mt-8">
        {!draft ? (
          <div className="h-64 animate-pulse rounded-card bg-canvas" aria-busy="true" />
        ) : step === 'journey' ? (
          <StepJourney draft={draft} update={update} next={() => go('vehicle')} autoSubmit={params.get('auto') === '1'} />
        ) : step === 'vehicle' ? (
          <StepVehicle draft={draft} update={update} next={() => go('details')} back={() => go('journey')} />
        ) : step === 'details' ? (
          <StepDetails draft={draft} update={update} next={() => go('payment')} back={() => go('vehicle')} />
        ) : (
          <StepPayment draft={draft} update={update} back={() => go('details')} restart={() => go('journey')} />
        )}
      </div>
    </div>
  );
}
