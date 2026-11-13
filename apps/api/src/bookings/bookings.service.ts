import { Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, type Prisma } from '@eul/db';
import { PrismaService } from '../prisma/prisma.service';
import type {
  BookingDetailDto,
  BookingListItemDto,
  BookingPageDto,
  BookingQueryDto,
} from './dto/bookings.dto';

const listInclude = {
  category: { select: { name: true } },
  customer: { select: { name: true } },
  assignment: { include: { driver: { include: { user: { select: { name: true } } } } } },
} as const satisfies Prisma.BookingInclude;

type ListRow = Prisma.BookingGetPayload<{ include: typeof listInclude }>;

function toListItem(b: ListRow): BookingListItemDto {
  return {
    id: b.id,
    reference: b.reference,
    status: b.status,
    type: b.type,
    pickupAt: b.pickupAt.toISOString(),
    pickupAddress: b.pickupAddress,
    dropoffAddress: b.dropoffAddress,
    categoryName: b.category.name,
    passengers: b.passengers,
    customerName: b.customer.name,
    priceMinor: b.priceMinor,
    currency: b.currency,
    driverName: b.assignment?.driver.user.name ?? null,
    createdAt: b.createdAt.toISOString(),
  };
}

/** Read side for dispatchers. Changes go through AssignmentService (and later cancel/dispatch). */
@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: BookingQueryDto): Promise<BookingPageDto> {
    const where: Prisma.BookingWhereInput = {
      status: q.status?.length ? { in: q.status } : undefined,
      type: q.type,
      pickupAt: q.from || q.to ? { gte: q.from ? new Date(q.from) : undefined, lt: q.to ? new Date(q.to) : undefined } : undefined,
      ...(q.search
        ? {
            OR: [
              { reference: { contains: q.search, mode: 'insensitive' } },
              { customer: { name: { contains: q.search, mode: 'insensitive' } } },
              { customer: { email: { contains: q.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const sort = q.sort ?? 'pickupAt';
    const dir = sort.startsWith('-') ? 'desc' : 'asc';
    const orderBy: Prisma.BookingOrderByWithRelationInput = sort.endsWith('createdAt') ? { createdAt: dir } : { pickupAt: dir };

    const [rows, total] = await this.prisma.db.$transaction([
      this.prisma.db.booking.findMany({ where, include: listInclude, orderBy, skip: q.skip, take: q.pageSize }),
      this.prisma.db.booking.count({ where }),
    ]);
    return { items: rows.map(toListItem), total, page: q.page, pageSize: q.pageSize };
  }

  /** Counts for the dashboard header badges. */
  async needsAttentionCount(): Promise<number> {
    return this.prisma.db.booking.count({ where: { status: BookingStatus.NEEDS_ATTENTION } });
  }

  async detail(id: string): Promise<BookingDetailDto> {
    const b = await this.prisma.db.booking.findUnique({
      where: { id },
      include: {
        ...listInclude,
        customer: true,
        payment: true,
        assignment: {
          include: {
            driver: { include: { user: { select: { name: true } } } },
            vehicle: true,
          },
        },
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!b) throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Booking not found.' });

    // Names for the people who changed things (history + assignment), one query.
    const actorIds = [
      ...new Set(
        [...b.statusHistory.map((h) => h.actorId), b.assignment?.assignedById].filter((v): v is string => !!v),
      ),
    ];
    const actors = actorIds.length
      ? await this.prisma.db.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } })
      : [];
    const nameOf = (id: string | null | undefined) => (id ? (actors.find((a) => a.id === id)?.name ?? null) : null);

    return {
      ...toListItem({ ...b, customer: { name: b.customer.name } }),
      customer: { id: b.customer.id, name: b.customer.name, email: b.customer.email, phone: b.customer.phone },
      passengerName: b.passengerName,
      passengerPhone: b.passengerPhone,
      flightNumber: b.flightNumber,
      notes: b.notes,
      language: b.language,
      priceBreakdown: (b.priceBreakdown ?? {}) as Record<string, unknown>,
      pickupLat: b.pickupLat,
      pickupLng: b.pickupLng,
      dropoffLat: b.dropoffLat,
      dropoffLng: b.dropoffLng,
      payment: b.payment
        ? {
            provider: b.payment.provider,
            status: b.payment.status,
            amountMinor: b.payment.amountMinor,
            currency: b.payment.currency,
            createdAt: b.payment.createdAt.toISOString(),
          }
        : null,
      assignment: b.assignment
        ? {
            driver: { id: b.assignment.driverId, name: b.assignment.driver.user.name, workPhone: b.assignment.driver.workPhone },
            vehicle: b.assignment.vehicle
              ? { id: b.assignment.vehicle.id, make: b.assignment.vehicle.make, model: b.assignment.vehicle.model, plate: b.assignment.vehicle.plate }
              : null,
            method: b.assignment.method,
            assignedByName: nameOf(b.assignment.assignedById),
            assignedAt: b.assignment.createdAt.toISOString(),
          }
        : null,
      history: b.statusHistory.map((h) => ({
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        actorName: nameOf(h.actorId) ?? (h.actorId ? null : 'System'),
        reason: h.reason,
        at: h.createdAt.toISOString(),
      })),
    };
  }
}
