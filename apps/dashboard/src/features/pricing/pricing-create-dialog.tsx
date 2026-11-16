import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import type { PricingRuleDto } from '@eul/api-client';
import { applyApiErrors } from '@/shared/lib/form-errors';
import { parseMoney } from '@/shared/lib/money';
import { FormAlert, FormField, inputClass, PrimaryButton, SecondaryButton } from '@/shared/ui/form';
import { Modal } from '@/shared/ui/modal';
import { useCategoriesForPricing, useCreatePricingRule } from './api';

export const CURRENCIES = ['DKK', 'EUR', 'USD'] as const;

const money = z.string().refine((v) => parseMoney(v) !== null, 'Enter an amount like 120 or 120.50');
const schema = z.object({
  categoryId: z.string().min(1, 'Choose a class'),
  currency: z.enum(CURRENCIES),
  baseFare: money,
  perKm: money,
  perMinute: money,
  minimumFare: money,
});
type Values = z.infer<typeof schema>;

/**
 * Add a price for a class in a currency (DKK, EUR or USD). Each currency is priced on purpose:
 * the platform never converts with exchange rates.
 */
export function PricingCreateDialog({ open, onOpenChange, existing }: { open: boolean; onOpenChange: (o: boolean) => void; existing: PricingRuleDto[] }) {
  const { t } = useTranslation();
  const categories = useCategoriesForPricing();
  const create = useCreatePricingRule();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, reset, setError, watch, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    reset({ categoryId: '', currency: 'DKK', baseFare: '', perKm: '0', perMinute: '0', minimumFare: '' });
  }, [open, reset]);

  const categoryId = watch('categoryId');
  const taken = new Set(existing.filter((r) => r.categoryId === categoryId).map((r) => r.currency));

  const onSubmit = handleSubmit((v) => {
    setFormError(null);
    create.mutate(
      {
        data: {
          categoryId: v.categoryId,
          currency: v.currency,
          baseFareMinor: parseMoney(v.baseFare) ?? 0,
          perKmMinor: parseMoney(v.perKm) ?? 0,
          perMinuteMinor: parseMoney(v.perMinute) ?? 0,
          minimumFareMinor: parseMoney(v.minimumFare) ?? 0,
          isActive: true,
          isConfirmed: false,
        },
      },
      {
        onSuccess: () => onOpenChange(false),
        onError: (error) => setFormError(applyApiErrors(error, setError, t('common.saveError')) ?? t('common.saveError')),
      },
    );
  });

  const moneyField = (name: 'baseFare' | 'perKm' | 'perMinute' | 'minimumFare', label: string) => (
    <FormField label={label} htmlFor={`new-${name}`} error={errors[name]?.message}>
      <input id={`new-${name}`} inputMode="decimal" className={`${inputClass} tabular-nums`} aria-invalid={!!errors[name]} {...register(name)} />
    </FormField>
  );

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t('pricing.addTitle')}
      description={t('pricing.addHint')}
      footer={
        <>
          <SecondaryButton onClick={() => onOpenChange(false)}>{t('common.cancel')}</SecondaryButton>
          <PrimaryButton type="submit" form="pricing-create-form" disabled={create.isPending}>
            {create.isPending ? t('common.saving') : t('common.save')}
          </PrimaryButton>
        </>
      }
    >
      <form id="pricing-create-form" onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormAlert message={formError} />
        <div className="grid grid-cols-2 gap-4">
          <FormField label={t('pricing.class')} htmlFor="new-categoryId" error={errors.categoryId?.message}>
            <select id="new-categoryId" className={inputClass} aria-invalid={!!errors.categoryId} {...register('categoryId')}>
              <option value="">{t('common.choose')}</option>
              {categories.data?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label={t('pricing.currency')} htmlFor="new-currency" error={errors.currency?.message}>
            <select id="new-currency" className={inputClass} {...register('currency')}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c} disabled={taken.has(c)}>
                  {c}{taken.has(c) ? ` (${t('pricing.alreadySet')})` : ''}
                </option>
              ))}
            </select>
          </FormField>
          {moneyField('baseFare', t('pricing.baseFare'))}
          {moneyField('minimumFare', t('pricing.minimumFare'))}
          {moneyField('perKm', t('pricing.perKm'))}
          {moneyField('perMinute', t('pricing.perMinute'))}
        </div>
      </form>
    </Modal>
  );
}
