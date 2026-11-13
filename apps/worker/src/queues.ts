/** Queue names and job payloads. The API adds jobs with the same names (keep in sync). */
export const QUEUE_EMAIL = 'email';

export interface EmailJob {
  to: string;
  subject: string;
  text: string;
  html?: string;
  template: string; // e.g. "booking-received", "booking-confirmed"
  bookingId?: string;
}
