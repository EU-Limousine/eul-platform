import { renderEnquiryEmail } from './enquiry-email';

const base = {
  id: '6f1c2e8e-1111-4222-8333-444455556666',
  type: 'BUSINESS' as const,
  name: 'Jane Doe',
  email: 'jane@example.com',
  message: 'We need transport for 20 guests.',
  language: 'en',
};

describe('renderEnquiryEmail', () => {
  it('names the type and the sender in the subject', () => {
    const { subject } = renderEnquiryEmail({ ...base, company: 'Acme ApS' });
    expect(subject).toBe('[EU Limousine] Business enquiry from Jane Doe (Acme ApS)');
  });

  it('never lets customer input break the subject line', () => {
    const { subject } = renderEnquiryEmail({ ...base, name: 'Evil\r\nBcc: x@example.com' });
    expect(subject).not.toMatch(/[\r\n]/);
  });

  it('escapes HTML from the customer', () => {
    const { html, text } = renderEnquiryEmail({ ...base, message: '<script>alert(1)</script>' });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(text).toContain('<script>alert(1)</script>'); // plain text stays readable
  });

  it('leaves out empty fields', () => {
    const { text } = renderEnquiryEmail({ ...base, phone: null, company: undefined });
    expect(text).not.toContain('Phone:');
    expect(text).not.toContain('Company:');
  });
});
