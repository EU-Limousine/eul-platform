import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { AssignmentMethod, BookingStatus, OfferStatus } from '@eul/db';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../auth/decorators';
import { copenhagenDate, dateOnly } from '../common/time';
import { EmailQueue } from '../notifications/email-queue';
import { renderBookingConfirmed } from '../notifications/templates/booking-confirmed';
import { PrismaService } from '../prisma/prisma.service';
import { ASSIGNABLE_STATUSES, assertTransition } from './booking-rules';
import type { AssignDriverDto, DriverCandidateDto } from './dto/bookings.dto';

const NOT_AVAILABLE = { code: 'RIDE_NOT_AVAILABLE', message: 'This ride is no longer available.' };
const FINISHED: BookingStatus[] = [BookingStatus.CANCELLED, BookingStatus.COMPLETED];

function fieldError(field: string, message: string): never {
  throw new UnprocessableEntityException({ code: 'VALIDATION_FAILED', message: 'Some fields are invalid.', fieldErrors: { [field]: [message] } });
}

/**
 * The ONLY way a driver gets a booking (§4.2): one locked transaction.
 * Driver acceptance (phase 1C) will call assignInTransaction() too. Never assign anywhere else.
 */
@Injectable()
export class AssignmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly emails: EmailQueue,
  ) {}

  async assignManually(actor: AuthUser, bookingId: string, dto: AssignDriverDto, requestId: string): Promise<void> {
    const driver = await this.prisma.db.driver.findUnique({
      where: { id: dto.driverId },
      include: { user: true },
    });
    if (!driver || !driver.isActive || !driver.user.isActive) fieldError('driverId', 'Driver is not active.');

    const vehicleId = dto.vehicleId ?? driver.vehicleId;
    if (!vehicleId) fieldError('vehicleId', 'This driver has no vehicle. Choose a vehicle.');
    const vehicle = await this.prisma.db.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle?.isActive) fieldError('vehicleId', 'Vehicle does not exist or is not active.');

    const booking = await this.prisma.db.$transaction(async (tx) => {
      // Lock the booking row: a second assignment (or a driver accepting) waits here, then sees ASSIGNED.
      const locked = await tx.$queryRaw<{ status: BookingStatus }[]>`
        SELECT status::text AS status FROM bookings WHERE id = ${bookingId}::uuid FOR UPDATE`;
      const current = locked[0];
      if (!current) throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Booking not found.' });
      if (!ASSIGNABLE_STATUSES.includes(current.status)) throw new ConflictException(NOT_AVAILABLE);
      assertTransition(current.status, BookingStatus.ASSIGNED);

      await tx.bookingAssignment.create({
        data: { bookingId, driverId: driver.id, vehicleId, method: AssignmentMethod.MANUAL, assignedById: actor.id },
      });
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.ASSIGNED },
        include: { customer: true },
      });
      await tx.bookingStatusHistory.create({
        data: { bookingId, fromStatus: current.status, toStatus: BookingStatus.ASSIGNED, actorId: actor.id, reason: 'Assigned manually' },
      });
      // Any open offers (regular or spare round) close automatically.
      const closed = await tx.bookingDriverNotification.updateMany({
        where: { bookingId, status: { in: [OfferStatus.SENT, OfferStatus.VIEWED] } },
        data: { status: OfferStatus.CLOSED },
      });
      await this.audit.log(
        {
          actorId: actor.id,
          action: 'booking.assign',
          entityType: 'booking',
          entityId: bookingId,
          before: { status: current.status },
          after: { status: BookingStatus.ASSIGNED, driverId: driver.id, vehicleId, method: 'MANUAL', offersClosed: closed.count },
          requestId,
        },
        tx,
      );
      return updated;
    });

    // After commit: customer confirmation with chauffeur details (§4.2 step 10).
    const mail = renderBookingConfirmed({
      language: booking.language,
      customerName: booking.customer.name,
      reference: booking.reference,
      pickupAt: booking.pickupAt,
      pickupAddress: booking.pickupAddress,
      dropoffAddress: booking.dropoffAddress,
      driver: { name: driver.user.name, phone: driver.workPhone },
      vehicle: { make: vehicle.make, model: vehicle.model, plate: vehicle.plate },
    });
    await this.emails.add(
      { to: booking.customer.email, ...mail, template: 'booking-confirmed', bookingId },
      `booking-confirmed-${bookingId}`,
    );
    // TODO(phase 1C): remove open offers' expiry jobs. TODO(phase 1D): push "You have been assigned a ride".
  }

  /** Drivers a dispatcher can pick, spare drivers for the booking's date first (§4.9). */
  async candidates(bookingId: string): Promise<DriverCandidateDto[]> {
    const booking = await this.prisma.db.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Booking not found.' });

    const localDate = copenhagenDate(booking.pickupAt);
    const drivers = await this.prisma.db.driver.findMany({
      where: { isActive: true, user: { isActive: true } },
      include: {
        user: { select: { name: true } },
        vehicle: { include: { category: true } },
        spareDays: { where: { date: dateOnly(localDate) } },
      },
    });

    // Other active trips per driver on the same Copenhagen date (window wide enough for any time zone offset).
    const dayTrips = await this.prisma.db.bookingAssignment.findMany({
      where: {
        driverId: { in: drivers.map((d) => d.id) },
        bookingId: { not: bookingId },
        booking: {
          status: { notIn: FINISHED },
          pickupAt: {
            gte: new Date(booking.pickupAt.getTime() - 26 * 3_600_000),
            lte: new Date(booking.pickupAt.getTime() + 26 * 3_600_000),
          },
        },
      },
      select: { driverId: true, booking: { select: { pickupAt: true } } },
    });
    const tripsSameDay = (driverId: string) =>
      dayTrips.filter((t) => t.driverId === driverId && copenhagenDate(t.booking.pickupAt) === localDate).length;

    const rows = drivers.map((d) => {
      const spare = d.spareDays[0];
      const vehicle = d.vehicle?.isActive ? d.vehicle : null;
      return {
        spareOrder: spare?.sortOrder ?? Number.MAX_SAFE_INTEGER,
        dto: {
          driverId: d.id,
          name: d.user.name,
          workPhone: d.workPhone,
          isAvailable: d.isAvailable,
          isSpare: !!spare,
          vehicle: vehicle ? { id: vehicle.id, make: vehicle.make, model: vehicle.model, plate: vehicle.plate } : null,
          vehicleCategoryName: vehicle?.category.name ?? null,
          categoryMatches: vehicle?.categoryId === booking.categoryId,
          fitsPassengers: (vehicle?.category.maxPassengers ?? 0) >= booking.passengers,
          tripsSameDay: tripsSameDay(d.id),
        } satisfies DriverCandidateDto,
      };
    });

    const rank = (b: boolean) => (b ? 0 : 1);
    rows.sort(
      (a, b) =>
        rank(a.dto.isSpare) - rank(b.dto.isSpare) ||
        a.spareOrder - b.spareOrder ||
        rank(a.dto.categoryMatches) - rank(b.dto.categoryMatches) ||
        rank(a.dto.fitsPassengers) - rank(b.dto.fitsPassengers) ||
        a.dto.tripsSameDay - b.dto.tripsSameDay ||
        a.dto.name.localeCompare(b.dto.name),
    );
    return rows.map((r) => r.dto);
  }
}
