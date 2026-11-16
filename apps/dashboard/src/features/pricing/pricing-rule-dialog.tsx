import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import type { PricingRuleDto } from '@eul/api-client';
import { applyApiErrors } from '@/shared/lib/form-errors';
import { minorToInput, parseMoney } from '@/shared/lib/money';
import { FormAlert, FormField, inputClass, PrimaryButton, SecondaryButton } from '@/shared/ui/form';
import { Modal } from '@/shared/ui/modal';
import { useUpdatePricingRule } from './api';

const money = z.string().refine((v) => parseMoney(v) !== null, 'Enter an amount like 120 or 120.50');
const schema = z.object({
  baseFare: money,
  perKm: money,
  perMinute: money,
  minimumFare: money,
  isActive: z.boolean(),
  isConfirmed: z.boolean(),
});
type Values = z.infer<typeof schema>;

/** Price changes only affect new quotes; existing bookings keep their price (§4.3). */
export function PricingRuleDialog({ rule, onClose }: { rule: PricingRuleDto | null; onClose: () => void }) {
  const { t } = useTranslation();
  const update = useUpdatePricingRule();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!rule) return;
    setFormError(null);
    reset({
      baseFare: minorToInput(rule.baseFareMinor),
      perKm: minorToInput(rule.perKmMinor),
      perMinute: minorToInput(rule.perMinuteMinor),
      minimumFare: minorToInput(rule.minimumFareMinor),
      isActive: rule.isActive,
      isConfirmed: rule.isConfirmed,
    });
  }, [rule, reset]);

  const onSubmit = handleSubmit((v) => {
    if (!rule) return;
    setFormError(null);
    update.mutate(
      {
        id: rule.id,
        data: {
          baseFareMinor: parseMoney(v.baseFare) ?? 0,
          perKmMinor: parseMoney(v.perKm) ?? 0,
          perMinuteMinor: parseMoney(v.perMinute) ?? 0,
          minimumFareMinor: parseMoney(v.minimumFare) ?? 0,
          isActive: v.isActive,
          isConfirmed: v.isConfirmed,
        },
      },
      {
        onSuccess: onClose,
        // Field names differ between form (baseFare) and API (baseFareMinor): show as one message.
        onError: (error) => setFormError(applyApiErrors(error, setError, t('common.saveError')) ?? t('common.saveError')),
      },
    );
  });

  const currency = rule?.currency ?? '';
  const moneyField = (name: keyof Omit<Values, 'isActive' | 'isConfirmed'>, label: string) => (
    <FormField label={`${label} (${currency})`} htmlFor={name} error={errors[name]?.message}>
      <input id={name} inputMode="decimal" className={`${inputClass} tabular-nums`} aria-invalid={!!errors[name]} {...register(name)} />
    </FormField>
  );

  return (
    <Modal
      open={!!rule}
      onOpenChange={(open) => !open && onClose()}
      title={t('pricing.editTitle', { category: rule?.categoryName ?? '' })}
      description={t('pricing.editHint')}
      footer={
        <>
          <SecondaryButton onClick={onClose}>{t('common.cancel')}</SecondaryButton>
          <PrimaryButton type="submit" form="pricing-form" disabled={update.isPending}>
            {update.isPending ? t('common.saving') : t('common.save')}
          </PrimaryButton>
        </>
      }
    >
      <form id="pricing-form" onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormAlert message={formError} />
        <div className="grid grid-cols-2 gap-4">
          {moneyField('baseFare', t('pricing.baseFare'))}
          {moneyField('minimumFare', t('pricing.minimumFare'))}
          {moneyField('perKm', t('pricing.perKm'))}
          {moneyField('perMinute', t('pricing.perMinute'))}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register('isActive')} /> {t('pricing.activeHint')}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register('isConfirmed')} /> {t('pricing.confirmedHint')}
        </label>
      </form>
    </Modal>
  );
}
