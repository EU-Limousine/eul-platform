import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BookingStatus,
  CheckoutStatus,
  PaymentStatus,
  type CheckoutSession,
  type Prisma,
  type Quote,
} from '@eul/db';
import { AuditService } from '../audit/audit.service';
import { bookingTypeFor, newBookingReference } from '../bookings/booking-rules';
import type { Env } from '../config/env';
import { EmailQueue } from '../notifications/email-queue';
import { renderBookingReceived } from '../notifications/templates/booking-received';
import {
  InvalidWebhookSignatureError,
  PAYMENT_PROVIDER,
  type PaymentProvider,
  type ProviderEvent,
} from '../payments/payment-provider';
import { PrismaService } from '../prisma/prisma.service';
import type { CheckoutCreatedDto, CheckoutStatusDto, CreateCheckoutDto } from './dto/checkouts.dto';

const QUOTE_INVALID = {
  code: 'QUOTE_EXPIRED',
  message: 'This price has expired. Please get a new price and try again.',
};

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2002';
}

/**
 * Payment-first booking (§4.3, §4.10):
 * quote → checkout session → provider payment → verified webhook → booking (one transaction).
 * A booking is never created from the browser redirect.
 */
@Injectable()
export class CheckoutsService {
  private readonly logger = new Logger(CheckoutsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly emails: EmailQueue,
    private readonly config: ConfigService<Env, true>,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  // ───────── Step 4 of the website: start payment ─────────

  async create(dto: CreateCheckoutDto, idempotencyKey: string): Promise<CheckoutCreatedDto> {
    if (!/^[A-Za-z0-9_-]{8,100}$/.test(idempotencyKey)) {
      throw new BadRequestException({ code: 'IDEMPOTENCY_KEY_INVALID', message: 'Missing or invalid Idempotency-Key header.' });
    }

    const quote = await this.prisma.db.quote.findUnique({
      where: { id: dto.quoteId },
      include: { booking: { select: { id: true } }, category: true },
    });
    if (!quote) throw new UnprocessableEntityException(QUOTE_INVALID);

    // Same key again (double click, retry) → same checkout, never a second payment.
    let checkout = await this.prisma.db.checkoutSession.findUnique({ where: { idempotencyKey } });
    if (checkout) {
      if (checkout.quoteId !== dto.quoteId) {
        throw new ConflictException({ code: 'IDEMPOTENCY_KEY_REUSED', message: 'This request key was already used.' });
      }
      if (checkout.providerPaymentId) return { checkoutId: checkout.id, redirectUrl: checkout.redirectUrl ?? undefined };
      // else: the first attempt failed before the payment was created → continue below
    } else {
      if (quote.expiresAt < new Date() || quote.pickupAt < new Date()) throw new UnprocessableEntityException(QUOTE_INVALID);
      if (quote.booking) throw new ConflictException({ code: 'QUOTE_ALREADY_BOOKED', message: 'This trip is already booked.' });
      checkout = await this.createSession(dto, idempotencyKey);
    }

    // Return URL is built here, never taken from the request (no open redirects).
    const website = this.config.get('WEBSITE_URL', { infer: true });
    const returnUrl = `${website}/${dto.language}/book/confirmation?checkout=${checkout.id}`;

    const payment = await this.provider.createPayment({
      checkoutId: checkout.id,
      amount: { amountMinor: quote.amountMinor, currency: quote.currency },
      description: `EU Limousine – ${quote.category.name}`,
      customerEmail: checkout.customerEmail,
      customerPhone: checkout.customerPhone ?? undefined,
      returnUrl,
      idempotencyKey: checkout.id,
    });

    await this.prisma.db.checkoutSession.update({
      where: { id: checkout.id },
      data: { providerPaymentId: payment.providerPaymentId, redirectUrl: payment.redirectUrl },
    });

    return { checkoutId: checkout.id, redirectUrl: payment.redirectUrl, clientToken: payment.clientToken };
  }

  private async createSession(dto: CreateCheckoutDto, idempotencyKey: string): Promise<CheckoutSession> {
    const ttlMs = this.config.get('CHECKOUT_TTL_MINUTES', { infer: true }) * 60_000;
    try {
      return await this.prisma.db.checkoutSession.create({
        data: {
          quoteId: dto.quoteId,
          idempotencyKey,
          provider: this.provider.name,
          customerEmail: dto.customer.email.toLowerCase(),
          customerName: dto.customer.name,
          customerPhone: dto.customer.phone,
          passengerName: dto.passengerName,
          passengerPhone: dto.passengerPhone,
          flightNumber: dto.flightNumber,
          notes: dto.notes,
          language: dto.language,
          expiresAt: new Date(Date.now() + ttlMs),
        },
      });
    } catch (error) {
      // Two identical requests at the same moment: the other one won, use its row.
      if (isUniqueViolation(error)) {
        const winner = await this.prisma.db.checkoutSession.findUnique({ where: { idempotencyKey } });
        if (winner) return winner;
      }
      throw error;
    }
  }

  // ───────── Return page polls this until the booking reference exists ─────────

  async status(checkoutId: string): Promise<CheckoutStatusDto> {
    const checkout = await this.prisma.db.checkoutSession.findUnique({
      where: { id: checkoutId },
      include: { quote: { include: { category: true } }, booking: { select: { reference: true } } },
    });
    if (!checkout) throw new NotFoundException({ code: 'CHECKOUT_NOT_FOUND', message: 'Checkout not found.' });

    const expired = checkout.status === CheckoutStatus.PENDING && checkout.expiresAt < new Date();
    return {
      checkoutId: checkout.id,
      status: expired ? CheckoutStatus.EXPIRED : checkout.status,
      bookingReference: checkout.booking?.reference ?? null,
      amountMinor: checkout.quote.amountMinor,
      currency: checkout.quote.currency,
      pickupAt: checkout.quote.pickupAt.toISOString(),
      pickupAddress: checkout.quote.pickupAddress,
      dropoffAddress: checkout.quote.dropoffAddress,
      categoryName: checkout.quote.category.name,
    };
  }

  // ───────── Provider webhook (signature-verified, idempotent) ─────────

  async handleWebhook(providerName: string, rawBody: Buffer | undefined, headers: Record<string, string>): Promise<void> {
    if (providerName !== this.provider.name) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Not found.' });
    if (!rawBody) throw new BadRequestException({ code: 'WEBHOOK_INVALID', message: 'Invalid webhook.' });

    let event: ProviderEvent;
    try {
      event = this.provider.parseWebhook(rawBody, headers);
    } catch (error) {
      if (error instanceof InvalidWebhookSignatureError) {
        throw new BadRequestException({ code: 'WEBHOOK_INVALID', message: 'Invalid webhook.' });
      }
      throw error;
    }

    // Store every verified event once. A resent event hits the unique key and is ignored.
    let storedEventId: string;
    try {
      const stored = await this.prisma.db.paymentEvent.create({
        data: {
          provider: providerName,
          providerEventId: event.eventId,
          type: event.type,
          payload: event as unknown as Prisma.InputJsonValue,
        },
      });
      storedEventId = stored.id;
    } catch (error) {
      if (isUniqueViolation(error)) return;
      throw error;
    }

    try {
      if (event.status === 'PAID') await this.onPaid(event);
      else if (event.status === 'FAILED' || event.status === 'CANCELLED') await this.onFailed(event);
    } catch (error) {
      // Processing failed: forget the event so the provider's retry is processed again.
      await this.prisma.db.paymentEvent.delete({ where: { id: storedEventId } }).catch(() => undefined);
      throw error;
    }
  }

  private async onFailed(event: ProviderEvent): Promise<void> {
    await this.prisma.db.checkoutSession.updateMany({
      where: { providerPaymentId: event.providerPaymentId, status: CheckoutStatus.PENDING },
      data: { status: CheckoutStatus.FAILED },
    });
  }

  /** Money is taken → create customer, booking, payment and history in ONE transaction. */
  private async onPaid(event: ProviderEvent): Promise<void> {
    const checkout = await this.prisma.db.checkoutSession.findUnique({
      where: { providerPaymentId: event.providerPaymentId },
      include: { quote: { include: { category: true, booking: { select: { id: true } } } } },
    });
    if (!checkout) {
      this.logger.error(`Paid event for unknown payment ${event.providerPaymentId}`);
      return;
    }
    if (checkout.bookingId) return; // already processed

    const { quote } = checkout;
    if (event.amount.amountMinor !== quote.amountMinor || event.amount.currency !== quote.currency) {
      // Never create a booking for a different amount than the quote. Needs a human.
      await this.audit.log({
        actorLabel: 'system',
        action: 'checkout.paid.amountMismatch',
        entityType: 'checkout',
        entityId: checkout.id,
        after: { paid: { ...event.amount }, quoted: { amountMinor: quote.amountMinor, currency: quote.currency } },
      });
      this.logger.error(`Amount mismatch on checkout ${checkout.id}`);
      return;
    }
    if (quote.booking) {
      // Same trip paid twice (two checkouts for one quote). Keep the money record for a manual refund.
      await this.prisma.db.checkoutSession.update({ where: { id: checkout.id }, data: { status: CheckoutStatus.PAID } });
      await this.audit.log({
        actorLabel: 'system',
        action: 'checkout.paid.duplicateTrip',
        entityType: 'checkout',
        entityId: checkout.id,
        after: { providerPaymentId: event.providerPaymentId, refundNeeded: true },
      });
      this.logger.error(`Duplicate payment for quote ${quote.id} — manual refund needed`);
      return;
    }

    const booking = await this.createBooking(checkout, quote, event);
    const mail = renderBookingReceived({
      language: checkout.language,
      customerName: checkout.customerName,
      reference: booking.reference,
      pickupAt: quote.pickupAt,
      pickupAddress: quote.pickupAddress,
      dropoffAddress: quote.dropoffAddress,
      categoryName: quote.category.name,
      amountMinor: quote.amountMinor,
      currency: quote.currency,
    });
    await this.emails.add(
      { to: checkout.customerEmail, ...mail, template: 'booking-received', bookingId: booking.id },
      `booking-received-${booking.id}`,
    );
    // TODO(phase 1C): queue the dispatch job here (same-day now, future at lead time).
  }

  private async createBooking(
    checkout: CheckoutSession,
    quote: Quote,
    event: ProviderEvent,
  ): Promise<{ id: string; reference: string }> {
    const settings = await this.prisma.db.dispatchSettings.findUnique({ where: { id: 1 } });
    const thresholdHours = settings?.sameDayThresholdHours ?? 4;

    for (let attempt = 0; attempt < 5; attempt++) {
      const reference = newBookingReference();
      try {
        return await this.prisma.db.$transaction(async (tx) => {
          const customer = await tx.customer.upsert({
            where: { email: checkout.customerEmail },
            update: { name: checkout.customerName, phone: checkout.customerPhone ?? undefined },
            create: {
              email: checkout.customerEmail,
              name: checkout.customerName,
              phone: checkout.customerPhone,
              preferredLanguage: checkout.language,
            },
          });
          const now = new Date();
          const booking = await tx.booking.create({
            data: {
              reference,
              status: BookingStatus.NEW,
              type: bookingTypeFor(quote.pickupAt, now, thresholdHours),
              customerId: customer.id,
              quoteId: quote.id,
              categoryId: quote.categoryId,
              pickupAddress: quote.pickupAddress,
              pickupLat: quote.pickupLat,
              pickupLng: quote.pickupLng,
              dropoffAddress: quote.dropoffAddress,
              dropoffLat: quote.dropoffLat,
              dropoffLng: quote.dropoffLng,
              pickupAt: quote.pickupAt,
              passengers: quote.passengers,
              passengerName: checkout.passengerName,
              passengerPhone: checkout.passengerPhone,
              flightNumber: checkout.flightNumber,
              notes: checkout.notes,
              language: checkout.language,
              priceMinor: quote.amountMinor,
              currency: quote.currency,
              priceBreakdown: quote.breakdown as Prisma.InputJsonValue,
            },
          });
          await tx.bookingStatusHistory.create({
            data: { bookingId: booking.id, fromStatus: null, toStatus: BookingStatus.NEW, reason: 'Paid online' },
          });
          await tx.payment.create({
            data: {
              bookingId: booking.id,
              provider: checkout.provider,
              providerPaymentId: event.providerPaymentId,
              amountMinor: event.amount.amountMinor,
              currency: event.amount.currency,
              status: PaymentStatus.PAID,
            },
          });
          await tx.checkoutSession.update({
            where: { id: checkout.id },
            data: { status: CheckoutStatus.PAID, bookingId: booking.id },
          });
          await this.audit.log(
            {
              actorLabel: 'system',
              action: 'booking.create',
              entityType: 'booking',
              entityId: booking.id,
              after: { reference, status: booking.status, type: booking.type, priceMinor: booking.priceMinor, currency: booking.currency },
            },
            tx,
          );
          return { id: booking.id, reference };
        });
      } catch (error) {
        // Only a reference clash is retried; anything else bubbles up (webhook will be resent).
        const meta = JSON.stringify((error as { meta?: unknown }).meta ?? {});
        if (isUniqueViolation(error) && meta.includes('reference')) continue;
        throw error;
      }
    }
    throw new Error('Could not generate a unique booking reference');
  }
}
