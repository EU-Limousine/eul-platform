import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Put,
  Query,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayUnique, IsArray, IsUUID, Matches } from 'class-validator';
import { AuditService } from '../audit/audit.service';
import { CurrentUser, RequirePermission, type AuthUser } from '../auth/decorators';
import { RequestId } from '../common/request-id.decorator';
import { dateOnly, toIsoDate } from '../common/time';
import { PrismaService } from '../prisma/prisma.service';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

// ───────── DTOs ─────────

export class SpareDateQueryDto {
  @ApiProperty({ example: '2026-11-20', description: 'Copenhagen local date' })
  @Matches(DATE, { message: 'date must be YYYY-MM-DD' })
  date!: string;
}

export class SetSparesDto extends SpareDateQueryDto {
  @ApiProperty({ type: [String], format: 'uuid', description: 'Driver IDs in offer order (first = asked first)' })
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(200)
  @IsUUID('all', { each: true })
  driverIds!: string[];
}

export class SpareDriverDto {
  @ApiProperty({ format: 'uuid' }) driverId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() sortOrder!: number;
}

export class SpareDayDto {
  @ApiProperty() date!: string;
  @ApiProperty({ type: [SpareDriverDto] }) drivers!: SpareDriverDto[];
}

// ───────── Service ─────────

/**
 * Spare drivers per date (§4.9). One row = "this driver is spare on this date".
 * Spare drivers are left out of that date's regular round and offered the ride in chunks.
 * "Copy from previous day" = the dashboard reads yesterday and saves it for today.
 */
@Injectable()
export class SparesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async get(isoDate: string): Promise<SpareDayDto> {
    const date = this.parse(isoDate);
    const rows = await this.prisma.db.driverSpareDay.findMany({
      where: { date },
      include: { driver: { include: { user: { select: { name: true } } } } },
      orderBy: { sortOrder: 'asc' },
    });
    return {
      date: toIsoDate(date),
      drivers: rows.map((r) => ({ driverId: r.driverId, name: r.driver.user.name, sortOrder: r.sortOrder })),
    };
  }

  /** Replaces the whole list for the date, in the given order. */
  async set(actorId: string, dto: SetSparesDto, requestId: string): Promise<SpareDayDto> {
    const date = this.parse(dto.date);
    const active = await this.prisma.db.driver.count({ where: { id: { in: dto.driverIds }, isActive: true } });
    if (active !== dto.driverIds.length) {
      throw new UnprocessableEntityException({
        code: 'VALIDATION_FAILED',
        message: 'Some fields are invalid.',
        fieldErrors: { driverIds: ['Every spare must be an active driver.'] },
      });
    }

    await this.prisma.db.$transaction(async (tx) => {
      const before = await tx.driverSpareDay.findMany({ where: { date }, orderBy: { sortOrder: 'asc' }, select: { driverId: true } });
      await tx.driverSpareDay.deleteMany({ where: { date } });
      await tx.driverSpareDay.createMany({
        data: dto.driverIds.map((driverId, index) => ({ driverId, date, sortOrder: index, createdById: actorId })),
      });
      await this.audit.log(
        {
          actorId,
          action: 'dispatch.spares.set',
          entityType: 'spareDay',
          entityId: dto.date,
          before: { driverIds: before.map((b) => b.driverId) },
          after: { driverIds: dto.driverIds },
          requestId,
        },
        tx,
      );
    });
    return this.get(dto.date);
  }

  private parse(isoDate: string): Date {
    try {
      return dateOnly(isoDate);
    } catch {
      throw new UnprocessableEntityException({
        code: 'VALIDATION_FAILED',
        message: 'Some fields are invalid.',
        fieldErrors: { date: ['Not a valid date.'] },
      });
    }
  }
}

// ───────── Controller ─────────

@ApiTags('dispatch')
@ApiBearerAuth()
@Controller('dispatch/spares')
export class SparesController {
  constructor(private readonly spares: SparesService) {}

  @Get()
  @RequirePermission('drivers.read')
  @ApiOkResponse({ type: SpareDayDto })
  get(@Query() query: SpareDateQueryDto): Promise<SpareDayDto> {
    return this.spares.get(query.date);
  }

  @Put()
  @RequirePermission('dispatch.spares.write')
  @ApiOkResponse({ type: SpareDayDto })
  set(@CurrentUser() user: AuthUser, @Body() dto: SetSparesDto, @RequestId() requestId: string): Promise<SpareDayDto> {
    return this.spares.set(user.id, dto, requestId);
  }
}

@Module({ controllers: [SparesController], providers: [SparesService] })
export class SparesModule {}
