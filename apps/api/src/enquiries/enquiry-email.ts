/**
 * Staff notification for a website enquiry. Plain text + escaped HTML; the customer's text is never
 * trusted as HTML. Pure function so it is tested without Nest.
 */
export interface EnquiryEmailData {
  id: string;
  type: 'GENERAL' | 'BUSINESS' | 'EVENT';
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  bookingReference?: string | null;
  topic?: string | null;
  message: string;
  language: string;
}

const LABELS: Record<EnquiryEmailData['type'], string> = {
  GENERAL: 'Contact form',
  BUSINESS: 'Business enquiry',
  EVENT: 'Event / group enquiry',
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Subject lines stay on one line (no header injection from customer input). */
function oneLine(value: string, max = 80): string {
  return value.replace(/[\r\n]+/g, ' ').trim().slice(0, max);
}

export function renderEnquiryEmail(d: EnquiryEmailData): { subject: string; text: string; html: string } {
  const label = LABELS[d.type];
  const subject = `[EU Limousine] ${label} from ${oneLine(d.name, 60)}${d.company ? ` (${oneLine(d.company, 60)})` : ''}`;
  const rows: [string, string | null | undefined][] = [
    ['Type', label],
    ['Name', d.name],
    ['Email', d.email],
    ['Phone', d.phone],
    ['Company', d.company],
    ['Booking reference', d.bookingReference],
    ['About', d.topic],
    ['Language', d.language],
    ['Enquiry ID', d.id],
  ];
  const filled = rows.filter((r): r is [string, string] => !!r[1]);

  const text = [...filled.map(([k, v]) => `${k}: ${v}`), '', 'Message:', d.message, '', `Reply directly to ${d.email}.`].join('\n');
  const html = `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#111;line-height:1.5">
<h2 style="margin:0 0 12px">${escapeHtml(label)}</h2>
<table style="border-collapse:collapse">${filled
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#555">${escapeHtml(k)}</td><td style="padding:4px 0">${escapeHtml(v)}</td></tr>`)
    .join('')}</table>
<h3 style="margin:16px 0 6px">Message</h3>
<p style="white-space:pre-wrap;margin:0">${escapeHtml(d.message)}</p>
<p style="margin-top:16px;color:#555">Reply directly to <a href="mailto:${escapeHtml(d.email)}">${escapeHtml(d.email)}</a>.</p>
</body></html>`;
  return { subject, text, html };
}
