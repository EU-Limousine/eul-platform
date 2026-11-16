import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import type { VehicleCategoryDto, VehicleDto } from '@eul/api-client';
import { applyApiErrors } from '@/shared/lib/form-errors';
import { FormAlert, FormField, inputClass, PrimaryButton, SecondaryButton } from '@/shared/ui/form';
import { Modal } from '@/shared/ui/modal';
import { useCreateVehicle, useUpdateVehicle } from './api';

// Same rules as the API (the API checks again).
const schema = z.object({
  categoryId: z.string().min(1, 'Choose a class'),
  make: z.string().trim().min(1, 'Required').max(60),
  model: z.string().trim().min(1, 'Required').max(60),
  plate: z.string().trim().min(2, 'Required').max(15),
  color: z.string().trim().max(40),
  notes: z.string().trim().max(500),
  isActive: z.boolean(),
});
type Values = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: VehicleCategoryDto[];
  vehicle?: VehicleDto; // undefined = add new
}

export function VehicleFormDialog({ open, onOpenChange, categories, vehicle }: Props) {
  const { t } = useTranslation();
  const create = useCreateVehicle();
  const update = useUpdateVehicle();
  const [formError, setFormError] = useState<string | null>(null);

  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    reset({
      categoryId: vehicle?.categoryId ?? '',
      make: vehicle?.make ?? '',
      model: vehicle?.model ?? '',
      plate: vehicle?.plate ?? '',
      color: vehicle?.color ?? '',
      notes: vehicle?.notes ?? '',
      isActive: vehicle?.isActive ?? true,
    });
  }, [open, vehicle, reset]);

  const saving = create.isPending || update.isPending;

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    const data = { ...values, color: values.color || undefined, notes: values.notes || undefined };
    const options = {
      onSuccess: () => onOpenChange(false),
      onError: (error: unknown) => setFormError(applyApiErrors(error, setError, t('common.saveError'))),
    };
    if (vehicle) update.mutate({ id: vehicle.id, data }, options);
    else create.mutate({ data }, options);
  });

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={vehicle ? t('vehicles.edit') : t('vehicles.add')}
      footer={
        <>
          <SecondaryButton onClick={() => onOpenChange(false)}>{t('common.cancel')}</SecondaryButton>
          <PrimaryButton type="submit" form="vehicle-form" disabled={saving}>
            {saving ? t('common.saving') : t('common.save')}
          </PrimaryButton>
        </>
      }
    >
      <form id="vehicle-form" onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormAlert message={formError} />
        <FormField label={t('vehicles.fields.category')} htmlFor="categoryId" error={errors.categoryId?.message}>
          <select id="categoryId" className={inputClass} aria-invalid={!!errors.categoryId} {...register('categoryId')}>
            <option value="">{t('common.choose')}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label={t('vehicles.fields.make')} htmlFor="make" error={errors.make?.message}>
            <input id="make" className={inputClass} aria-invalid={!!errors.make} {...register('make')} />
          </FormField>
          <FormField label={t('vehicles.fields.model')} htmlFor="model" error={errors.model?.message}>
            <input id="model" className={inputClass} aria-invalid={!!errors.model} {...register('model')} />
          </FormField>
          <FormField label={t('vehicles.fields.plate')} htmlFor="plate" error={errors.plate?.message}>
            <input id="plate" className={`${inputClass} uppercase`} aria-invalid={!!errors.plate} {...register('plate')} />
          </FormField>
          <FormField label={t('vehicles.fields.color')} htmlFor="color" error={errors.color?.message}>
            <input id="color" className={inputClass} {...register('color')} />
          </FormField>
        </div>
        <FormField label={t('vehicles.fields.notes')} htmlFor="notes" error={errors.notes?.message}>
          <textarea id="notes" rows={2} className={inputClass} {...register('notes')} />
        </FormField>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register('isActive')} /> {t('vehicles.fields.active')}
        </label>
      </form>
    </Modal>
  );
}
