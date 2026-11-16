import { Controller, Get, Injectable, Module } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { BookingStatus, Currency, PaymentStatus } from '@eul/db';
import { CurrentUser, RequirePermission, type AuthUser } from '../auth/decorators';
import { copenhagenDate } from '../common/time';
import { PrismaService } from '../prisma/prisma.service';

const DAY = 24 * 60 * 60 * 1000;
const ON_TRIP: BookingStatus[] = [BookingStatus.DRIVER_EN_ROUTE, BookingStatus.ARRIVED, BookingStatus.IN_JOURNEY];
const UNASSIGNED: BookingStatus[] = [BookingStatus.NEW, BookingStatus.PENDING_DISPATCH, BookingStatus.DRIVERS_NOTIFIED];

// ───────── DTOs ─────────

export class DayCountDto {
  @ApiProperty({ example: '2026-11-14', description: 'Copenhagen date' }) date!: string;
  @ApiProperty() created!: number;
  @ApiProperty() completed!: number;
}

export class BookingKpisDto {
  @ApiProperty({ description: 'Bookings created in the last 7 days' }) last7d!: number;
  @ApiProperty({ description: 'Bookings created in the 7 days before that' }) prev7d!: number;
  @ApiProperty({ description: 'Pickups today (Copenhagen)' }) pickupsToday!: number;
  @ApiProperty() needsAttention!: number;
  @ApiProperty({ description: 'Paid, no driver yet' }) unassigned!: number;
  @ApiProperty({ type: [DayCountDto] }) series!: DayCountDto[];
}

export class CustomerKpisDto {
  @ApiProperty() total!: number;
  @ApiProperty() new7d!: number;
  @ApiProperty() prev7d!: number;
}

export class DriverKpisDto {
  @ApiProperty() active!: number;
  @ApiProperty({ description: 'On duty and not on a trip' }) available!: number;
  @ApiProperty() onTrip!: number;
  @ApiProperty() offDuty!: number;
  @ApiProperty() inactive!: number;
}

export class VehicleKpisDto {
  @ApiProperty() total!: number;
  @ApiProperty({ description: 'Active and not on a trip' }) available!: number;
  @ApiProperty() onTrip!: number;
  @ApiProperty() inactive!: number;
}

export class MoneyDto {
  @ApiProperty({ enum: Currency, enumName: 'Currency' }) currency!: Currency;
  @ApiProperty() amountMinor!: number;
}

export class RevenueKpisDto {
  @ApiProperty({ type: [MoneyDto] }) last7d!: MoneyDto[];
  @ApiProperty({ type: [MoneyDto] }) prev7d!: MoneyDto[];
}

export class RecentBookingDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() reference!: string;
  @ApiProperty() customerName!: string;
  @ApiProperty() categoryName!: string;
  @ApiPropertyOptional({ nullable: true, type: String }) driverName!: string | null;
  @ApiProperty({ format: 'date-time' }) pickupAt!: string;
  @ApiProperty({ enum: BookingStatus, enumName: 'BookingStatus' }) status!: BookingStatus;
}

export class ActivityDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'booking.assign' }) action!: string;
  @ApiProperty() entityType!: string;
  @ApiPropertyOptional({ nullable: true, type: String }) entityId!: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) actorName!: string | null;
  @ApiProperty({ format: 'date-time' }) at!: string;
}

export class OverviewDto {
  @ApiProperty({ format: 'date-time' }) generatedAt!: string;
  @ApiProperty({ type: BookingKpisDto }) bookings!: BookingKpisDto;
  @ApiPropertyOptional({ type: CustomerKpisDto, nullable: true }) customers!: CustomerKpisDto | null;
  @ApiPropertyOptional({ type: DriverKpisDto, nullable: true }) drivers!: DriverKpisDto | null;
  @ApiPropertyOptional({ type: VehicleKpisDto, nullable: true }) vehicles!: VehicleKpisDto | null;
  @ApiPropertyOptional({ type: RevenueKpisDto, nullable: true }) revenue!: RevenueKpisDto | null;
  @ApiProperty({ type: [RecentBookingDto] }) recentBookings!: RecentBookingDto[];
  @ApiPropertyOptional({ type: [ActivityDto], nullable: true }) activity!: ActivityDto[] | null;
}

// ───────── Service ─────────

/** Real numbers only. Each block is included only when the user has the matching permission. */
@Injectable()
export class OverviewService {
  constructor(private readonly prisma: PrismaService) {}

  async get(user: AuthUser): Promise<OverviewDto> {
    const can = (p: string) => user.permissions.includes(p as never);
    const now = new Date();
    const [bookings, customers, fleet, revenue, recentBookings, activity] = await Promise.all([
      this.bookings(now),
      can('customers.read') ? this.customers(now) : null,
      can('drivers.read') || can('vehicles.read') ? this.fleet() : null,
      can('payments.read') ? this.revenue(now) : null,
      this.recentBookings(),
      can('audit.read') ? this.activity() : null,
    ]);
    return {
      generatedAt: now.toISOString(),
      bookings,
      customers,
      drivers: can('drivers.read') ? (fleet?.drivers ?? null) : null,
      vehicles: can('vehicles.read') ? (fleet?.vehicles ?? null) : null,
      revenue,
      recentBookings,
      activity,
    };
  }

  /** The last 7 Copenhagen dates, oldest first (date strings, so DST cannot shift them). */
  private lastSevenDates(now: Date): string[] {
    const dates = new Set<string>();
    for (let h = 0; dates.size < 7; h += 12) dates.add(copenhagenDate(new Date(now.getTime() - h * 3_600_000)));
    return [...dates].sort();
  }

  private async bookings(now: Date): Promise<BookingKpisDto> {
    const dates = this.lastSevenDates(now);
    const today = copenhagenDate(now);
    const [created, completed, prev7d, needsAttention, unassigned, aroundToday] = await Promise.all([
      this.prisma.db.booking.findMany({ where: { createdAt: { gte: new Date(now.getTime() - 8 * DAY) } }, select: { createdAt: true } }),
      this.prisma.db.bookingStatusHistory.findMany({
        where: { toStatus: BookingStatus.COMPLETED, createdAt: { gte: new Date(now.getTime() - 8 * DAY) } },
        select: { createdAt: true },
      }),
      this.prisma.db.booking.count({ where: { createdAt: { gte: new Date(now.getTime() - 14 * DAY), lt: new Date(now.getTime() - 7 * DAY) } } }),
      this.prisma.db.booking.count({ where: { status: BookingStatus.NEEDS_ATTENTION } }),
      this.prisma.db.booking.count({ where: { status: { in: UNASSIGNED } } }),
      this.prisma.db.booking.findMany({
        where: { pickupAt: { gte: new Date(now.getTime() - 2 * DAY), lte: new Date(now.getTime() + 2 * DAY) }, status: { not: BookingStatus.CANCELLED } },
        select: { pickupAt: true },
      }),
    ]);

    const countByDate = (rows: { createdAt: Date }[]) => {
      const map = new Map<string, number>();
      for (const r of rows) {
        const d = copenhagenDate(r.createdAt);
        map.set(d, (map.get(d) ?? 0) + 1);
      }
      return map;
    };
    const createdBy = countByDate(created);
    const completedBy = countByDate(completed);
    const series = dates.map((date) => ({ date, created: createdBy.get(date) ?? 0, completed: completedBy.get(date) ?? 0 }));

    return {
      last7d: series.reduce((sum, d) => sum + d.created, 0),
      prev7d,
      pickupsToday: aroundToday.filter((b) => copenhagenDate(b.pickupAt) === today).length,
      needsAttention,
      unassigned,
      series,
    };
  }

  private async customers(now: Date): Promise<CustomerKpisDto> {
    const [total, new7d, prev7d] = await Promise.all([
      this.prisma.db.customer.count(),
      this.prisma.db.customer.count({ where: { createdAt: { gte: new Date(now.getTime() - 7 * DAY) } } }),
      this.prisma.db.customer.count({ where: { createdAt: { gte: new Date(now.getTime() - 14 * DAY), lt: new Date(now.getTime() - 7 * DAY) } } }),
    ]);
    return { total, new7d, prev7d };
  }

  private async fleet(): Promise<{ drivers: DriverKpisDto; vehicles: VehicleKpisDto }> {
    const [drivers, vehicles, onTripRows] = await Promise.all([
      this.prisma.db.driver.findMany({ select: { id: true, isActive: true, isAvailable: true, user: { select: { isActive: true } } } }),
      this.prisma.db.vehicle.findMany({ select: { id: true, isActive: true } }),
      this.prisma.db.bookingAssignment.findMany({ where: { booking: { status: { in: ON_TRIP } } }, select: { driverId: true, vehicleId: true } }),
    ]);
    const driversOnTrip = new Set(onTripRows.map((r) => r.driverId));
    const vehiclesOnTrip = new Set(onTripRows.map((r) => r.vehicleId).filter((v): v is string => !!v));

    const active = drivers.filter((d) => d.isActive && d.user.isActive);
    const onTrip = active.filter((d) => driversOnTrip.has(d.id)).length;
    const available = active.filter((d) => d.isAvailable && !driversOnTrip.has(d.id)).length;

    const activeVehicles = vehicles.filter((v) => v.isActive);
    const vOnTrip = activeVehicles.filter((v) => vehiclesOnTrip.has(v.id)).length;

    return {
      drivers: { active: active.length, available, onTrip, offDuty: active.length - available - onTrip, inactive: drivers.length - active.length },
      vehicles: { total: vehicles.length, available: activeVehicles.length - vOnTrip, onTrip: vOnTrip, inactive: vehicles.length - activeVehicles.length },
    };
  }

  private async revenue(now: Date): Promise<RevenueKpisDto> {
    const sum = async (from: Date, to: Date) => {
      const rows = await this.prisma.db.payment.groupBy({
        by: ['currency'],
        where: { status: { in: [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED] }, createdAt: { gte: from, lt: to } },
        _sum: { amountMinor: true },
      });
      return rows.map((r) => ({ currency: r.currency, amountMinor: r._sum.amountMinor ?? 0 }));
    };
    const [last7d, prev7d] = await Promise.all([
      sum(new Date(now.getTime() - 7 * DAY), now),
      sum(new Date(now.getTime() - 14 * DAY), new Date(now.getTime() - 7 * DAY)),
    ]);
    return { last7d, prev7d };
  }

  private async recentBookings(): Promise<RecentBookingDto[]> {
    const rows = await this.prisma.db.booking.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: {
        customer: { select: { name: true } },
        category: { select: { name: true } },
        assignment: { include: { driver: { include: { user: { select: { name: true } } } } } },
      },
    });
    return rows.map((b) => ({
      id: b.id,
      reference: b.reference,
      customerName: b.customer.name,
      categoryName: b.category.name,
      driverName: b.assignment?.driver.user.name ?? null,
      pickupAt: b.pickupAt.toISOString(),
      status: b.status,
    }));
  }

  private async activity(): Promise<ActivityDto[]> {
    const rows = await this.prisma.db.auditLog.findMany({
      where: { action: { not: 'auth.login' } },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });
    const ids = [...new Set(rows.map((r) => r.actorId).filter((v): v is string => !!v))];
    const actors = ids.length ? await this.prisma.db.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }) : [];
    return rows.map((r) => ({
      id: r.id,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      actorName: r.actorId ? (actors.find((a) => a.id === r.actorId)?.name ?? null) : (r.actorLabel ?? 'System'),
      at: r.createdAt.toISOString(),
    }));
  }
}

// ───────── Controller ─────────

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class OverviewController {
  constructor(private readonly overview: OverviewService) {}

  @Get('overview')
  @RequirePermission('bookings.read')
  @ApiOkResponse({ type: OverviewDto })
  get(@CurrentUser() user: AuthUser): Promise<OverviewDto> {
    return this.overview.get(user);
  }
}

@Module({ controllers: [OverviewController], providers: [OverviewService] })
export class OverviewModule {}
