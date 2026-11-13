import { TIME_ZONE } from '../../common/time';

/**
 * "Booking received, payment successful" (§4.6). Never says "confirmed":
 * confirmation with chauffeur details is a separate email after assignment.
 * TODO(content): final wording and translations for all 7 languages; English is the fallback.
 */
export interface BookingReceivedData {
  language: string;
  customerName: string;
  reference: string;
  pickupAt: Date;
  pickupAddress: string;
  dropoffAddress: string;
  categoryName: string;
  amountMinor: number;
  currency: string;
}

const BRAND = 'EU Limousine';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export function renderBookingReceived(d: BookingReceivedData): { subject: string; text: string; html: string } {
  const locale = d.language === 'en' ? 'en-GB' : d.language;
  const when = new Intl.DateTimeFormat(locale, {
    timeZone: TIME_ZONE,
    dateStyle: 'full',
    timeStyle: 'short',
    timeZoneName: 'short',
  }).format(d.pickupAt);
  const amount = new Intl.NumberFormat(locale, { style: 'currency', currency: d.currency }).format(d.amountMinor / 100);

  const subject = `${BRAND}: booking received (${d.reference})`;
  const lines = [
    `Dear ${d.customerName},`,
    '',
    'Thank you. We have received your booking and your payment was successful.',
    'You will receive a second email with your chauffeur’s details once a chauffeur has been assigned.',
    '',
    `Booking reference: ${d.reference}`,
    `Pickup: ${when}`,
    `From: ${d.pickupAddress}`,
    `To: ${d.dropoffAddress}`,
    `Vehicle class: ${d.categoryName}`,
    `Amount paid: ${amount}`,
    '',
    BRAND,
  ];
  const text = lines.join('\n');
  const html = `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#0f1f2d;line-height:1.5">${lines
    .map((line) => (line ? `<p style="margin:0 0 4px">${escapeHtml(line)}</p>` : '<br>'))
    .join('')}</body></html>`;
  return { subject, text, html };
}
