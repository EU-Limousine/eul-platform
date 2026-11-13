import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import argon2 from 'argon2';
import { StaffRole, type Prisma } from '@eul/db';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../auth/decorators';
import { checkRoleChange } from '../auth/role-rules';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateDriverDto, DriverDto, DriverPageDto, DriverQueryDto, UpdateDriverDto } from './dto/drivers.dto';

const driverInclude = {
  user: true,
  vehicle: { include: { category: true } },
} as const satisfies Prisma.DriverInclude;

type DriverRow = Prisma.DriverGetPayload<{ include: typeof driverInclude }>;

function toDto(d: DriverRow): DriverDto {
  return {
    id: d.id,
    userId: d.userId,
    name: d.user.name,
    email: d.user.email,
    workPhone: d.workPhone,
    driverType: d.driverType,
    isActive: d.isActive,
    userIsActive: d.user.isActive,
    isAvailable: d.isAvailable,
    vehicle: d.vehicle
      ? {
          id: d.vehicle.id,
          make: d.vehicle.make,
          model: d.vehicle.model,
          plate: d.vehicle.plate,
          categoryName: d.vehicle.category.name,
        }
      : null,
    createdAt: d.createdAt.toISOString(),
  };
}

@Injectable()
export class DriversService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: DriverQueryDto): Promise<DriverPageDto> {
    const where: Prisma.DriverWhereInput = {
      isActive: query.isActive,
      ...(query.search
        ? {
            OR: [
              { workPhone: { contains: query.search } },
              { user: { name: { contains: query.search, mode: 'insensitive' } } },
              { user: { email: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.db.$transaction([
      this.prisma.db.driver.findMany({
        where,
        include: driverInclude,
        orderBy: [{ isActive: 'desc' }, { user: { name: 'asc' } }],
        skip: query.skip,
        take: query.pageSize,
      }),
      this.prisma.db.driver.count({ where }),
    ]);
    return { items: items.map(toDto), total, page: query.page, pageSize: query.pageSize };
  }

  async get(id: string): Promise<DriverDto> {
    return toDto(await this.findOrThrow(id));
  }

  /**
   * Creates a staff login with the DRIVER role and the driver profile in one transaction.
   * Needs drivers.write + users.write (guard) and the right to grant DRIVER (role rules).
   */
  async create(actor: AuthUser, dto: CreateDriverDto, requestId: string): Promise<DriverDto> {
    const check = checkRoleChange(actor, '', [StaffRole.DRIVER]);
    if (!check.ok) throw new ForbiddenException({ code: 'ROLE_CHANGE_NOT_ALLOWED', message: check.reason });

    const email = dto.email.toLowerCase();
    if (await this.prisma.db.user.findUnique({ where: { email } })) {
      throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'A user with this email already exists.' });
    }
    if (dto.vehicleId) await this.assertVehicleUsable(dto.vehicleId);
    const passwordHash = await argon2.hash(dto.password);

    const driver = await this.prisma.db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          name: dto.name,
          phone: dto.workPhone,
          passwordHash,
          roles: { create: { role: StaffRole.DRIVER, grantedById: actor.id } },
        },
      });
      const created = await tx.driver.create({
        data: {
          userId: user.id,
          workPhone: dto.workPhone,
          driverType: dto.driverType,
          vehicleId: dto.vehicleId,
        },
        include: driverInclude,
      });
      await this.audit.log(
        {
          actorId: actor.id,
          action: 'driver.create',
          entityType: 'driver',
          entityId: created.id,
          after: { userId: user.id, email, driverType: created.driverType, vehicleId: dto.vehicleId ?? null },
          requestId,
        },
        tx,
      );
      return created;
    });
    return toDto(driver);
  }

  async update(actorId: string, id: string, dto: UpdateDriverDto, requestId: string): Promise<DriverDto> {
    const before = await this.findOrThrow(id);
    if (dto.vehicleId) await this.assertVehicleUsable(dto.vehicleId);

    const updated = await this.prisma.db.$transaction(async (tx) => {
      if (dto.name !== undefined) {
        await tx.user.update({ where: { id: before.userId }, data: { name: dto.name } });
      }
      const row = await tx.driver.update({
        where: { id },
        data: {
          workPhone: dto.workPhone,
          driverType: dto.driverType,
          vehicleId: dto.vehicleId,
          isActive: dto.isActive,
          // A deactivated driver is never on duty
          ...(dto.isActive === false ? { isAvailable: false } : {}),
        },
        include: driverInclude,
      });
      await this.audit.log(
        {
          actorId,
          action: 'driver.update',
          entityType: 'driver',
          entityId: id,
          before: {
            name: before.user.name,
            workPhone: before.workPhone,
            driverType: before.driverType,
            vehicleId: before.vehicleId,
            isActive: before.isActive,
          },
          after: { ...dto },
          requestId,
        },
        tx,
      );
      return row;
    });
    return toDto(updated);
  }

  private async findOrThrow(id: string): Promise<DriverRow> {
    const row = await this.prisma.db.driver.findUnique({ where: { id }, include: driverInclude });
    if (!row) throw new NotFoundException({ code: 'DRIVER_NOT_FOUND', message: 'Driver not found.' });
    return row;
  }

  private async assertVehicleUsable(vehicleId: string): Promise<void> {
    const vehicle = await this.prisma.db.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle?.isActive) {
      throw new UnprocessableEntityException({
        code: 'VALIDATION_FAILED',
        message: 'Some fields are invalid.',
        fieldErrors: { vehicleId: ['Vehicle does not exist or is not active.'] },
      });
    }
  }
}
