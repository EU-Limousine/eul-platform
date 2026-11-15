import { renderBookingConfirmed } from './booking-confirmed';
import { renderBookingReceived } from './booking-received';

const base = {
  language: 'en',
  customerName: 'Test <Person>',
  reference: 'EUL-ABC234',
  pickupAt: new Date('2026-11-20T09:00:00Z'),
  pickupAddress: 'Pickup A',
  dropoffAddress: 'Drop-off B',
};

describe('email templates', () => {
  it('booking received never says "confirmed"', () => {
    const mail = renderBookingReceived({ ...base, categoryName: 'Business', amountMinor: 12_000, currency: 'EUR' });
    expect(mail.subject).toContain('EUL-ABC234');
    expect(mail.text.toLowerCase()).not.toContain('confirmed');
    expect(mail.text).toContain('10:00'); // 09:00 UTC = 10:00 Copenhagen in November
  });

  it('booking confirmed includes driver name, phone, model and plate', () => {
    const mail = renderBookingConfirmed({
      ...base,
      driver: { name: 'Driver Name', phone: '+45 11 22 33 44' },
      vehicle: { make: 'Make', model: 'Model', plate: 'AB 12 345' },
    });
    for (const s of ['Driver Name', '+45 11 22 33 44', 'Model', 'AB 12 345']) expect(mail.text).toContain(s);
  });

  it('escapes HTML in customer input', () => {
    const mail = renderBookingConfirmed({ ...base, driver: { name: 'D', phone: 'P' }, vehicle: null });
    expect(mail.html).toContain('Test &lt;Person&gt;');
    expect(mail.html).not.toContain('<Person>');
  });
});
