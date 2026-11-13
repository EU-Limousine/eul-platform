import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Prisma } from '@eul/db';
import { AuditService } from '../audit/audit.service';
import { rethrowUnique } from '../common/prisma-errors';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateVehicleCategoryDto,
  CreateVehicleDto,
  UpdateVehicleCategoryDto,
  UpdateVehicleDto,
  VehicleCategoryDto,
  VehicleDto,
  VehiclePageDto,
  VehicleQueryDto,
} from './dto/vehicles.dto';

type CategoryRow = Prisma.VehicleCategoryGetPayload<{ include: { _count: { select: { vehicles: true } } } }>;
type VehicleRow = Prisma.VehicleGetPayload<{ include: { category: true } }>;

const CATEGORY_TAKEN = { code: 'CATEGORY_CODE_TAKEN', message: 'A category with this code already exists.' };
const PLATE_TAKEN = { code: 'PLATE_TAKEN', message: 'A vehicle with this plate already exists.' };

function toCategoryDto(c: CategoryRow): VehicleCategoryDto {
  return {
    id: c.id,
    code: c.code,
    name: c.name,
    exampleModel: c.exampleModel,
    maxPassengers: c.maxPassengers,
    luggageNote: c.luggageNote,
    description: c.description,
    sortOrder: c.sortOrder,
    isActive: c.isActive,
    isConfirmed: c.isConfirmed,
    vehicleCount: c._count.vehicles,
  };
}

function toVehicleDto(v: VehicleRow): VehicleDto {
  return {
    id: v.id,
    categoryId: v.categoryId,
    categoryName: v.category.name,
    make: v.make,
    model: v.model,
    plate: v.plate,
    color: v.color,
    isActive: v.isActive,
    isConfirmed: v.isConfirmed,
    notes: v.notes,
    createdAt: v.createdAt.toISOString(),
  };
}

const withCount = { _count: { select: { vehicles: true } } } as const;

@Injectable()
export class VehiclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ───────── Categories ─────────

  async listCategories(): Promise<VehicleCategoryDto[]> {
    const rows = await this.prisma.db.vehicleCategory.findMany({
      include: withCount,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return rows.map(toCategoryDto);
  }

  async createCategory(actorId: string, dto: CreateVehicleCategoryDto, requestId: string): Promise<VehicleCategoryDto> {
    try {
      const row = await this.prisma.db.$transaction(async (tx) => {
        const created = await tx.vehicleCategory.create({ data: dto, include: withCount });
        await this.audit.log(
          { actorId, action: 'vehicleCategory.create', entityType: 'vehicleCategory', entityId: created.id, after: { ...dto }, requestId },
          tx,
        );
        return created;
      });
      return toCategoryDto(row);
    } catch (error) {
      rethrowUnique(error, CATEGORY_TAKEN.code, CATEGORY_TAKEN.message);
    }
  }

  async updateCategory(
    actorId: string,
    id: string,
    dto: UpdateVehicleCategoryDto,
    requestId: string,
  ): Promise<VehicleCategoryDto> {
    const before = await this.prisma.db.vehicleCategory.findUnique({ where: { id } });
    if (!before) throw new NotFoundException({ code: 'CATEGORY_NOT_FOUND', message: 'Vehicle category not found.' });
    try {
      const row = await this.prisma.db.$transaction(async (tx) => {
        const updated = await tx.vehicleCategory.update({ where: { id }, data: dto, include: withCount });
        await this.audit.log(
          { actorId, action: 'vehicleCategory.update', entityType: 'vehicleCategory', entityId: id, before: { ...before, createdAt: before.createdAt.toISOString(), updatedAt: before.updatedAt.toISOString() }, after: { ...dto }, requestId },
          tx,
        );
        return updated;
      });
      return toCategoryDto(row);
    } catch (error) {
      rethrowUnique(error, CATEGORY_TAKEN.code, CATEGORY_TAKEN.message);
    }
  }

  // ───────── Vehicles ─────────

  async listVehicles(query: VehicleQueryDto): Promise<VehiclePageDto> {
    const where: Prisma.VehicleWhereInput = {
      categoryId: query.categoryId,
      isActive: query.isActive,
      ...(query.search
        ? {
            OR: [
              { plate: { contains: query.search, mode: 'insensitive' } },
              { make: { contains: query.search, mode: 'insensitive' } },
              { model: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.db.$transaction([
      this.prisma.db.vehicle.findMany({
        where,
        include: { category: true },
        orderBy: [{ isActive: 'desc' }, { plate: 'asc' }],
        skip: query.skip,
        take: query.pageSize,
      }),
      this.prisma.db.vehicle.count({ where }),
    ]);
    return { items: items.map(toVehicleDto), total, page: query.page, pageSize: query.pageSize };
  }

  async getVehicle(id: string): Promise<VehicleDto> {
    const row = await this.prisma.db.vehicle.findUnique({ where: { id }, include: { category: true } });
    if (!row) throw new NotFoundException({ code: 'VEHICLE_NOT_FOUND', message: 'Vehicle not found.' });
    return toVehicleDto(row);
  }

  async createVehicle(actorId: string, dto: CreateVehicleDto, requestId: string): Promise<VehicleDto> {
    await this.assertCategoryExists(dto.categoryId);
    try {
      const row = await this.prisma.db.$transaction(async (tx) => {
        const created = await tx.vehicle.create({ data: dto, include: { category: true } });
        await this.audit.log(
          { actorId, action: 'vehicle.create', entityType: 'vehicle', entityId: created.id, after: { ...dto }, requestId },
          tx,
        );
        return created;
      });
      return toVehicleDto(row);
    } catch (error) {
      rethrowUnique(error, PLATE_TAKEN.code, PLATE_TAKEN.message);
    }
  }

  async updateVehicle(actorId: string, id: string, dto: UpdateVehicleDto, requestId: string): Promise<VehicleDto> {
    const before = await this.prisma.db.vehicle.findUnique({ where: { id } });
    if (!before) throw new NotFoundException({ code: 'VEHICLE_NOT_FOUND', message: 'Vehicle not found.' });
    if (dto.categoryId) await this.assertCategoryExists(dto.categoryId);
    try {
      const row = await this.prisma.db.$transaction(async (tx) => {
        const updated = await tx.vehicle.update({ where: { id }, data: dto, include: { category: true } });
        await this.audit.log(
          {
            actorId,
            action: 'vehicle.update',
            entityType: 'vehicle',
            entityId: id,
            before: { categoryId: before.categoryId, make: before.make, model: before.model, plate: before.plate, color: before.color, isActive: before.isActive, isConfirmed: before.isConfirmed },
            after: { ...dto },
            requestId,
          },
          tx,
        );
        return updated;
      });
      return toVehicleDto(row);
    } catch (error) {
      rethrowUnique(error, PLATE_TAKEN.code, PLATE_TAKEN.message);
    }
  }

  private async assertCategoryExists(categoryId: string): Promise<void> {
    const exists = await this.prisma.db.vehicleCategory.count({ where: { id: categoryId } });
    if (!exists) {
      throw new UnprocessableEntityException({
        code: 'VALIDATION_FAILED',
        message: 'Some fields are invalid.',
        fieldErrors: { categoryId: ['Vehicle category does not exist.'] },
      });
    }
  }
}
