import { Link } from '@tanstack/react-router';
import { CheckCircle2, Mail, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { EnquiryDto } from '@eul/api-client';
import { useCan } from '@/features/auth/can';
import { formatDateTime } from '@/shared/lib/format';
import { Field } from '@/shared/ui/card';
import { FormAlert, PrimaryButton, SecondaryButton } from '@/shared/ui/form';
import { Modal } from '@/shared/ui/modal';
import { errorMessage } from '@/shared/ui/states';
import { useUpdateEnquiry } from './api';
import { EnquiryStatusBadge } from './enquiry-status-badge';

interface Props {
  enquiry: EnquiryDto | undefined;
  onOpenChange: (open: boolean) => void;
  /** The API's answer after a status change, so the dialog shows the saved state. */
  onSaved: (enquiry: EnquiryDto) => void;
}

/** One enquiry: who, what, and the actions (reply by email, mark handled or reopen). */
export function EnquiryDialog({ enquiry, onOpenChange, onSaved }: Props) {
  const { t } = useTranslation();
  const canWrite = useCan('enquiries.write');
  const update = useUpdateEnquiry();
  if (!enquiry) return null;

  const handled = enquiry.status === 'HANDLED';
  const setStatus = (status: 'NEW' | 'HANDLED') =>
    update.mutate({ id: enquiry.id, data: { status } }, { onSuccess: (saved) => onSaved(saved) });

  // Staff answer from their own mailbox (Hostinger), so the reply thread stays there.
  const subject = enquiry.bookingReference
    ? t('enquiries.replySubjectWithRef', { reference: enquiry.bookingReference })
    : t('enquiries.replySubject');
  const mailto = `mailto:${enquiry.email}?subject=${encodeURIComponent(subject)}`;

  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) update.reset();
        onOpenChange(open);
      }}
      title={t(`enquiries.types.${enquiry.type}`)}
      description={formatDateTime(enquiry.createdAt)}
      width="w-[min(640px,94vw)]"
      footer={
        <>
          <a
            href={mailto}
            className="inline-flex items-center gap-2 rounded-control border border-border px-4 py-2 text-sm hover:bg-canvas"
          >
            <Mail size={16} aria-hidden /> {t('enquiries.reply')}
          </a>
          {canWrite &&
            (handled ? (
              <SecondaryButton disabled={update.isPending} onClick={() => setStatus('NEW')}>
                <RotateCcw size={16} aria-hidden /> {update.isPending ? t('common.saving') : t('enquiries.reopen')}
              </SecondaryButton>
            ) : (
              <PrimaryButton disabled={update.isPending} onClick={() => setStatus('HANDLED')}>
                <CheckCircle2 size={16} aria-hidden /> {update.isPending ? t('common.saving') : t('enquiries.markHandled')}
              </PrimaryButton>
            ))}
        </>
      }
    >
      <div className="space-y-4">
        <FormAlert message={update.isError ? errorMessage(update.error, t('common.saveError')) : null} />

        <dl>
          <Field label={t('enquiries.fields.status')}>
            <span className="inline-flex flex-wrap items-center gap-2">
              <EnquiryStatusBadge status={enquiry.status} />
              {handled && enquiry.handledAt && (
                <span className="text-xs text-text-muted">
                  {t('enquiries.handledBy', { name: enquiry.handledByName ?? t('enquiries.someone'), when: formatDateTime(enquiry.handledAt) })}
                </span>
              )}
            </span>
          </Field>
          <Field label={t('enquiries.fields.name')}>{enquiry.name}</Field>
          <Field label={t('enquiries.fields.email')}>
            <a href={mailto} className="underline-offset-2 hover:underline">{enquiry.email}</a>
          </Field>
          {enquiry.phone && (
            <Field label={t('enquiries.fields.phone')}>
              <a href={`tel:${enquiry.phone.replace(/[^+0-9]/g, '')}`} className="tabular-nums underline-offset-2 hover:underline">
                {enquiry.phone}
              </a>
            </Field>
          )}
          {enquiry.company && <Field label={t('enquiries.fields.company')}>{enquiry.company}</Field>}
          {enquiry.bookingReference && (
            <Field label={t('enquiries.fields.reference')}>
              <Link to="/bookings" search={{ q: enquiry.bookingReference }} className="font-medium tabular-nums underline-offset-2 hover:underline">
                {enquiry.bookingReference}
              </Link>
            </Field>
          )}
          {enquiry.topic && (
            <Field label={t('enquiries.fields.topic')}>{t(`enquiries.topics.${enquiry.topic}`, { defaultValue: enquiry.topic })}</Field>
          )}
          <Field label={t('enquiries.fields.language')}>{enquiry.language.toUpperCase()}</Field>
        </dl>

        <div>
          <h3 className="mb-1.5 text-sm font-medium text-text-muted">{t('enquiries.fields.message')}</h3>
          <p className="rounded-control border border-border bg-canvas p-3 text-sm whitespace-pre-wrap text-text">{enquiry.message}</p>
        </div>
      </div>
    </Modal>
  );
}
