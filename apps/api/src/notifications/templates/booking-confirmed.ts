import { TIME_ZONE } from '../../common/time';

/**
 * "Booking confirmed — your chauffeur" (§4.6, D-23). Sent once a driver is assigned.
 * Template-driven: the template receives `driver` and `vehicle` objects. To show more
 * (photo, colour…), add the field to the context type below and use it here — the
 * dispatch code does not change.
 * TODO(content): final wording and translations for all 7 languages; English is the fallback.
 */
export interface BookingConfirmedContext {
  language: string;
  customerName: string;
  reference: string;
  pickupAt: Date;
  pickupAddress: string;
  dropoffAddress: string;
  driver: { name: string; phone: string };
  vehicle: { make: string; model: string; plate: string } | null;
}

const BRAND = 'EU Limousine';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export function renderBookingConfirmed(c: BookingConfirmedContext): { subject: string; text: string; html: string } {
  const locale = c.language === 'en' ? 'en-GB' : c.language;
  const when = new Intl.DateTimeFormat(locale, {
    timeZone: TIME_ZONE,
    // dateStyle/timeStyle cannot be combined with timeZoneName, so list the parts.
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(c.pickupAt);

  const subject = `${BRAND}: booking confirmed — your chauffeur (${c.reference})`;
  const lines = [
    `Dear ${c.customerName},`,
    '',
    'Your booking is confirmed. Here are your chauffeur’s details:',
    '',
    `Chauffeur: ${c.driver.name}`,
    `Phone: ${c.driver.phone}`,
    ...(c.vehicle ? [`Vehicle: ${c.vehicle.make} ${c.vehicle.model}`, `Plate: ${c.vehicle.plate}`] : []),
    '',
    `Booking reference: ${c.reference}`,
    `Pickup: ${when}`,
    `From: ${c.pickupAddress}`,
    `To: ${c.dropoffAddress}`,
    '',
    BRAND,
  ];
  const text = lines.join('\n');
  const html = `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#0f1f2d;line-height:1.5">${lines
    .map((line) => (line ? `<p style="margin:0 0 4px">${escapeHtml(line)}</p>` : '<br>'))
    .join('')}</body></html>`;
  return { subject, text, html };
}
