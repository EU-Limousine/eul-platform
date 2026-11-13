import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import {
  InvalidWebhookSignatureError,
  type CreatePaymentInput,
  type PaymentProvider,
  type ProviderEvent,
  type ProviderPaymentStatus,
} from '../payment-provider';

export const FAKE_SIGNATURE_HEADER = 'x-fake-signature';

/**
 * Development and test provider (refused in production by env validation).
 * createPayment points to a local page with Pay / Fail buttons; pressing one makes
 * the provider sign a webhook to itself, so the real webhook code path runs.
 */
export class FakePaymentProvider implements PaymentProvider {
  readonly name = 'fake';
  private readonly payments = new Map<string, { status: ProviderPaymentStatus; input: CreatePaymentInput }>();

  constructor(
    private readonly secret: string,
    private readonly apiPublicUrl: string,
  ) {}

  async createPayment(input: CreatePaymentInput) {
    const providerPaymentId = `fake_${randomUUID()}`;
    this.payments.set(providerPaymentId, { status: 'PENDING', input });
    return { providerPaymentId, redirectUrl: `${this.apiPublicUrl}/fake-pay/${providerPaymentId}` };
  }

  async getPayment(providerPaymentId: string): Promise<ProviderPaymentStatus> {
    return this.payments.get(providerPaymentId)?.status ?? 'PENDING';
  }

  async refund(input: { providerPaymentId: string }) {
    const payment = this.payments.get(input.providerPaymentId);
    if (payment) payment.status = 'REFUNDED';
    return { providerRefundId: `fake_refund_${randomUUID()}`, status: 'SUCCEEDED' as const };
  }

  parseWebhook(rawBody: Buffer, headers: Record<string, string>): ProviderEvent {
    const given = Buffer.from(headers[FAKE_SIGNATURE_HEADER] ?? '', 'hex');
    const expected = Buffer.from(this.sign(rawBody), 'hex');
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
      throw new InvalidWebhookSignatureError('Invalid fake webhook signature');
    }
    return JSON.parse(rawBody.toString('utf8')) as ProviderEvent;
  }

  /** Used by the fake payment page: decide the outcome and build a signed webhook. */
  complete(providerPaymentId: string, outcome: 'PAID' | 'FAILED'): { rawBody: Buffer; headers: Record<string, string>; returnUrl: string } | null {
    const payment = this.payments.get(providerPaymentId);
    if (!payment) return null;
    payment.status = outcome;
    const event: ProviderEvent = {
      eventId: `fake_evt_${randomUUID()}`,
      type: 'payment.updated',
      providerPaymentId,
      status: outcome,
      amount: payment.input.amount,
    };
    const rawBody = Buffer.from(JSON.stringify(event), 'utf8');
    return { rawBody, headers: { [FAKE_SIGNATURE_HEADER]: this.sign(rawBody) }, returnUrl: payment.input.returnUrl };
  }

  /** For the fake page: amount and description of a pending payment. */
  describe(providerPaymentId: string): CreatePaymentInput | null {
    return this.payments.get(providerPaymentId)?.input ?? null;
  }

  private sign(rawBody: Buffer): string {
    return createHmac('sha256', this.secret).update(rawBody).digest('hex');
  }
}
