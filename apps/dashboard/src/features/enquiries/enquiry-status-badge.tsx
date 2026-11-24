import { CheckCircle2, CircleDot } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { EnquiryStatus } from '@eul/api-client';

/** Enquiry status with colour AND icon AND text (separate from the booking StatusBadge on purpose). */
export function EnquiryStatusBadge({ status }: { status: EnquiryStatus }) {
  const { t } = useTranslation();
  const handled = status === 'HANDLED';
  const Icon = handled ? CheckCircle2 : CircleDot;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${
        handled ? 'border-success/30 bg-success-bg text-text' : 'border-info/30 bg-info-bg text-text'
      }`}
    >
      <Icon size={13} aria-hidden className={handled ? 'text-success' : 'text-info'} />
      {t(`enquiries.status.${status}`)}
    </span>
  );
}
