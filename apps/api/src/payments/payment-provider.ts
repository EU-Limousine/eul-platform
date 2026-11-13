/**
 * The only payment contract the platform knows (CLAUDE.md §4.10). Provider is D-01 (open).
 * Adding the real provider = one new file in ./providers implementing this + config.
 * Nothing outside payments/ ever sees a provider's own types or statuses.
 */
export interface Money {
  amountMinor: number;
  currency: 'DKK' | 'EUR';
}

export type ProviderPaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';

export interface ProviderEvent {
  /** Provider's unique event ID — used to ignore resent webhooks. */
  eventId: string;
  type: string;
  providerPaymentId: string;
  status: ProviderPaymentStatus;
  amount: Money;
}

export interface CreatePaymentInput {
  checkoutId: string;
  amount: Money;
  description: string;
  customerEmail: string;
  customerPhone?: string;
  returnUrl: string;
  idempotencyKey: string;
}

export interface PaymentProvider {
  readonly name: string;
  createPayment(input: CreatePaymentInput): Promise<{ providerPaymentId: string; redirectUrl?: string; clientToken?: string }>;
  getPayment(providerPaymentId: string): Promise<ProviderPaymentStatus>;
  refund(input: {
    providerPaymentId: string;
    amount: Money;
    reason: string;
    idempotencyKey: string;
  }): Promise<{ providerRefundId: string; status: 'PENDING' | 'SUCCEEDED' | 'FAILED' }>;
  /** Throws if the signature is invalid. */
  parseWebhook(rawBody: Buffer, headers: Record<string, string>): ProviderEvent;
}

/** Nest injection token for the active provider. */
export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

export class InvalidWebhookSignatureError extends Error {}
