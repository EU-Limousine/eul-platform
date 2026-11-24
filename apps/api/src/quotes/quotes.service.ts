import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Currency } from '@eul/db';
import type { Env } from '../config/env';
import { calculatePrice } from '../pricing/price-calculator';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateQuoteDto, QuoteOptionDto, QuoteResponseDto } from './dto/quotes.dto';
import { RouteService } from './route.service';

function invalid(field: string, message: string): never {
  throw new UnprocessableEntityException({
    code: 'VALIDATION_FAILED',
    message: 'Some fields are invalid.',
    fieldErrors: { [field]: [message] },
  });
}

/**
 * Prices are calculated only here, from the active pricing rules (§4.3).
 * One stored quote per vehicle category that fits the passengers; each expires.
 */
@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly routes: RouteService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async create(dto: CreateQuoteDto): Promise<QuoteResponseDto> {
    const pickupAt = new Date(dto.pickupAt);
    const minLeadMs = this.config.get('MIN_BOOKING_LEAD_MINUTES', { infer: true }) * 60_000;
    if (pickupAt.getTime() < Date.now() + minLeadMs) {
      // TODO(decision D-07): final minimum notice for bookings.
      invalid('pickupAt', 'Pickup time is too soon. Please choose a later time.');
    }
    if (dto.pickup.lat === dto.dropoff.lat && dto.pickup.lng === dto.dropoff.lng) {
      invalid('dropoff', 'Pickup and drop-off are the same place.');
    }
    // TODO(decision): service area limits (Copenhagen + CPH first) are not defined yet.

    const route = await this.routes.route(dto.pickup, dto.dropoff);
    // Only classes with an active price in this currency are offered — never converted (no exchange rates).
    const currency = dto.currency ?? Currency[this.config.get('DEFAULT_CURRENCY', { infer: true })];
    const ttlMs = this.config.get('QUOTE_TTL_MINUTES', { infer: true }) * 60_000;
    const expiresAt = new Date(Date.now() + ttlMs);

    const categories = await this.prisma.db.vehicleCategory.findMany({
      where: {
        isActive: true,
        maxPassengers: { gte: dto.passengers },
        pricingRules: { some: { currency, isActive: true } },
      },
      include: { pricingRules: { where: { currency, isActive: true }, take: 1 } },
      orderBy: { sortOrder: 'asc' },
    });

    const options: QuoteOptionDto[] = [];
    for (const category of categories) {
      const rule = category.pricingRules[0];
      if (!rule) continue;
      const price = calculatePrice(rule, route.distanceMeters, route.durationSeconds);
      const quote = await this.prisma.db.quote.create({
        data: {
          categoryId: category.id,
          pickupAddress: dto.pickup.address,
          pickupLat: dto.pickup.lat,
          pickupLng: dto.pickup.lng,
          dropoffAddress: dto.dropoff.address,
          dropoffLat: dto.dropoff.lat,
          dropoffLng: dto.dropoff.lng,
          pickupAt,
          passengers: dto.passengers,
          distanceMeters: route.distanceMeters,
          durationSeconds: route.durationSeconds,
          amountMinor: price.totalMinor,
          currency,
          breakdown: { ...price, pricingRuleId: rule.id, distanceSource: route.source },
          expiresAt,
        },
      });
      options.push({
        quoteId: quote.id,
        category: {
          id: category.id,
          code: category.code,
          name: category.name,
          exampleModel: category.exampleModel,
          maxPassengers: category.maxPassengers,
          luggageNote: category.luggageNote,
          description: category.description,
        },
        amountMinor: price.totalMinor,
        breakdown: {
          baseFareMinor: price.baseFareMinor,
          distanceMinor: price.distanceMinor,
          timeMinor: price.timeMinor,
          minimumFareMinor: price.minimumFareMinor,
          minimumApplied: price.minimumApplied,
        },
        currency,
        expiresAt: expiresAt.toISOString(),
      });
    }

    return {
      options,
      distanceMeters: route.distanceMeters,
      durationSeconds: route.durationSeconds,
      distanceSource: route.source,
    };
  }
}
