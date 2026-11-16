import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import type { DriverDto } from '@eul/api-client';
import { applyApiErrors } from '@/shared/lib/form-errors';
import { FormAlert, FormField, inputClass, PrimaryButton, SecondaryButton } from '@/shared/ui/form';
import { Modal } from '@/shared/ui/modal';
import { useActiveVehicles, useCreateDriver, useUpdateDriver } from './api';

const PHONE = /^\+?[0-9 ()-]{6,20}$/;
const DRIVER_TYPES = ['EMPLOYEE', 'CONTRACTOR'] as const;

// Same rules as the API (the API checks again). Password only when creating.
const schema = z.object({
  name: z.string().trim().min(1, 'Required').max(120),
  email: z.string().trim(),
  password: z.string(),
  workPhone: z.string().trim().regex(PHONE, 'Use digits, spaces and an optional +'),
  driverType: z.enum(DRIVER_TYPES),
  vehicleId: z.string(),
  isActive: z.boolean(),
});
type Values = z.infer<typeof schema>;

const createSchema = schema.extend({
  email: z.email('Enter a valid email'),
  password: z.string().min(12, 'At least 12 characters'),
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver?: DriverDto; // undefined = add new
}

export function DriverFormDialog({ open, onOpenChange, driver }: Props) {
  const { t } = useTranslation();
  const vehicles = useActiveVehicles();
  const create = useCreateDriver();
  const update = useUpdateDriver();
  const [formError, setFormError] = useState<string | null>(null);
  const isNew = !driver;

  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(isNew ? createSchema : schema),
  });

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    reset({
      name: driver?.name ?? '',
      email: driver?.email ?? '',
      password: '',
      workPhone: driver?.workPhone ?? '',
      driverType: driver?.driverType ?? 'EMPLOYEE',
      vehicleId: driver?.vehicle?.id ?? '',
      isActive: driver?.isActive ?? true,
    });
  }, [open, driver, reset]);

  const saving = create.isPending || update.isPending;

  const onSubmit = handleSubmit((v) => {
    setFormError(null);
    const options = {
      onSuccess: () => onOpenChange(false),
      onError: (error: unknown) => setFormError(applyApiErrors(error, setError, t('common.saveError'))),
    };
    if (driver) {
      update.mutate(
        {
          id: driver.id,
          data: { name: v.name, workPhone: v.workPhone, driverType: v.driverType, vehicleId: v.vehicleId || null, isActive: v.isActive },
        },
        options,
      );
    } else {
      create.mutate(
        {
          data: {
            name: v.name,
            email: v.email,
            password: v.password,
            workPhone: v.workPhone,
            driverType: v.driverType,
            vehicleId: v.vehicleId || undefined,
          },
        },
        options,
      );
    }
  });

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isNew ? t('drivers.add') : t('drivers.edit')}
      description={isNew ? t('drivers.addHint') : undefined}
      footer={
        <>
          <SecondaryButton onClick={() => onOpenChange(false)}>{t('common.cancel')}</SecondaryButton>
          <PrimaryButton type="submit" form="driver-form" disabled={saving}>
            {saving ? t('common.saving') : t('common.save')}
          </PrimaryButton>
        </>
      }
    >
      <form id="driver-form" onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormAlert message={formError} />
        <FormField label={t('drivers.fields.name')} htmlFor="name" error={errors.name?.message}>
          <input id="name" className={inputClass} aria-invalid={!!errors.name} {...register('name')} />
        </FormField>
        {isNew && (
          <div className="grid grid-cols-2 gap-4">
            <FormField label={t('drivers.fields.email')} htmlFor="email" error={errors.email?.message}>
              <input id="email" type="email" autoComplete="off" className={inputClass} aria-invalid={!!errors.email} {...register('email')} />
            </FormField>
            <FormField label={t('drivers.fields.password')} htmlFor="password" error={errors.password?.message} hint={t('drivers.passwordHint')}>
              <input id="password" type="password" autoComplete="new-password" className={inputClass} aria-invalid={!!errors.password} {...register('password')} />
            </FormField>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <FormField label={t('drivers.fields.workPhone')} htmlFor="workPhone" error={errors.workPhone?.message} hint={t('drivers.phoneHint')}>
            <input id="workPhone" type="tel" className={inputClass} aria-invalid={!!errors.workPhone} {...register('workPhone')} />
          </FormField>
          <FormField label={t('drivers.fields.type')} htmlFor="driverType" error={errors.driverType?.message}>
            <select id="driverType" className={inputClass} {...register('driverType')}>
              {DRIVER_TYPES.map((type) => (
                <option key={type} value={type}>{t(`drivers.types.${type}`)}</option>
              ))}
            </select>
          </FormField>
        </div>
        <FormField label={t('drivers.fields.vehicle')} htmlFor="vehicleId" error={errors.vehicleId?.message}>
          <select id="vehicleId" className={inputClass} {...register('vehicleId')}>
            <option value="">{t('drivers.noVehicle')}</option>
            {vehicles.data?.items.map((veh) => (
              <option key={veh.id} value={veh.id}>
                {veh.plate} · {veh.make} {veh.model} ({veh.categoryName})
              </option>
            ))}
          </select>
        </FormField>
        {!isNew && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('isActive')} /> {t('drivers.fields.active')}
          </label>
        )}
      </form>
    </Modal>
  );
}
