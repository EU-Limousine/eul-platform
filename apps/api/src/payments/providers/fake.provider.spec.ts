import { InvalidWebhookSignatureError } from '../payment-provider';
import { FAKE_SIGNATURE_HEADER, FakePaymentProvider } from './fake.provider';

const input = {
  checkoutId: 'c1',
  amount: { amountMinor: 12_000, currency: 'EUR' as const },
  description: 'Test',
  customerEmail: 'test@example.com',
  returnUrl: 'http://localhost:3000/en/book/confirmation?checkout=c1',
  idempotencyKey: 'k1',
};

describe('FakePaymentProvider', () => {
  it('signs and verifies its own webhook', async () => {
    const provider = new FakePaymentProvider('secret', 'http://localhost:8080');
    const { providerPaymentId } = await provider.createPayment(input);
    const hook = provider.complete(providerPaymentId, 'PAID')!;
    const event = provider.parseWebhook(hook.rawBody, hook.headers);
    expect(event.status).toBe('PAID');
    expect(event.providerPaymentId).toBe(providerPaymentId);
    expect(await provider.getPayment(providerPaymentId)).toBe('PAID');
  });

  it('rejects a tampered body', async () => {
    const provider = new FakePaymentProvider('secret', 'http://localhost:8080');
    const { providerPaymentId } = await provider.createPayment(input);
    const hook = provider.complete(providerPaymentId, 'PAID')!;
    const tampered = Buffer.from(hook.rawBody.toString().replace('12000', '1'));
    expect(() => provider.parseWebhook(tampered, hook.headers)).toThrow(InvalidWebhookSignatureError);
  });

  it('rejects a missing or wrong signature', async () => {
    const provider = new FakePaymentProvider('secret', 'http://localhost:8080');
    const { providerPaymentId } = await provider.createPayment(input);
    const hook = provider.complete(providerPaymentId, 'PAID')!;
    expect(() => provider.parseWebhook(hook.rawBody, {})).toThrow(InvalidWebhookSignatureError);
    expect(() => provider.parseWebhook(hook.rawBody, { [FAKE_SIGNATURE_HEADER]: 'abcd' })).toThrow(InvalidWebhookSignatureError);
  });
});
