import { Body, Controller, Get, Injectable, NotFoundException, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { EnquiryStatus, EnquiryType, type Prisma } from '@eul/db';
import { AuditService } from '../audit/audit.service';
import { CurrentUser, RequirePermission, type AuthUser } from '../auth/decorators';
import { PageQueryDto } from '../common/page-query.dto';
import { RequestId } from '../common/request-id.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { enquiryStatusChange } from './enquiry-status';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || undefined : value);

// ───────── DTOs ─────────

export class EnquiryDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: EnquiryType, enumName: 'EnquiryType' }) type!: EnquiryType;
  @ApiProperty({ enum: EnquiryStatus, enumName: 'EnquiryStatus' }) status!: EnquiryStatus;
  @ApiProperty() name!: string;
  @ApiProperty() email!: string;
  @ApiProperty({ type: String, nullable: true }) phone!: string | null;
  @ApiProperty({ type: String, nullable: true }) company!: string | null;
  @ApiProperty({ type: String, nullable: true }) bookingReference!: string | null;
  @ApiProperty({ type: String, nullable: true, description: 'Where the form was sent from, e.g. "events-weddings"' }) topic!: string | null;
  @ApiProperty() message!: string;
  @ApiProperty({ description: 'Website language the customer wrote from' }) language!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) handledAt!: string | null;
  @ApiProperty({ type: String, nullable: true }) handledByName!: string | null;
}

export class EnquiryPageDto {
  @ApiProperty({ type: [EnquiryDto] }) items!: EnquiryDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty({ description: 'Enquiries still NEW (all types), for the inbox badge' }) newCount!: number;
}

export class EnquiryQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: EnquiryStatus, enumName: 'EnquiryStatus' }) @IsOptional() @IsEnum(EnquiryStatus) status?: EnquiryStatus;
  @ApiPropertyOptional({ enum: EnquiryType, enumName: 'EnquiryType' }) @IsOptional() @IsEnum(EnquiryType) type?: EnquiryType;

  @ApiPropertyOptional({ description: 'Search name, email, company, booking reference or message' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  search?: string;
}

export class UpdateEnquiryDto {
  @ApiProperty({ enum: EnquiryStatus, enumName: 'EnquiryStatus' }) @IsEnum(EnquiryStatus) status!: EnquiryStatus;
}

// ───────── Service ─────────

const include = { handledBy: { select: { name: true } } } as const satisfies Prisma.EnquiryInclude;
type EnquiryRow = Prisma.EnquiryGetPayload<{ include: typeof include }>;

function toDto(e: EnquiryRow): EnquiryDto {
  return {
    id: e.id,
    type: e.type,
    status: e.status,
    name: e.name,
    email: e.email,
    phone: e.phone,
    company: e.company,
    bookingReference: e.bookingReference,
    topic: e.topic,
    message: e.message,
    language: e.language,
    createdAt: e.createdAt.toISOString(),
    handledAt: e.handledAt?.toISOString() ?? null,
    handledByName: e.handledBy?.name ?? null,
  };
}

const NOT_FOUND = { code: 'ENQUIRY_NOT_FOUND', message: 'Enquiry not found.' };

@Injectable()
export class EnquiriesInboxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: EnquiryQueryDto): Promise<EnquiryPageDto> {
    const s = query.search;
    const where: Prisma.EnquiryWhereInput = {
      status: query.status,
      type: query.type,
      ...(s
        ? {
            OR: [
              { name: { contains: s, mode: 'insensitive' } },
              { email: { contains: s, mode: 'insensitive' } },
              { company: { contains: s, mode: 'insensitive' } },
              { bookingReference: { contains: s, mode: 'insensitive' } },
              { message: { contains: s, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total, newCount] = await this.prisma.db.$transaction([
      this.prisma.db.enquiry.findMany({ where, include, orderBy: { createdAt: 'desc' }, skip: query.skip, take: query.pageSize }),
      this.prisma.db.enquiry.count({ where }),
      this.prisma.db.enquiry.count({ where: { status: EnquiryStatus.NEW } }),
    ]);
    return { items: items.map(toDto), total, page: query.page, pageSize: query.pageSize, newCount };
  }

  async get(id: string): Promise<EnquiryDto> {
    const row = await this.prisma.db.enquiry.findUnique({ where: { id }, include });
    if (!row) throw new NotFoundException(NOT_FOUND);
    return toDto(row);
  }

  /** Mark handled or reopen. Same status again is a no-op (no audit row). */
  async update(actor: AuthUser, id: string, dto: UpdateEnquiryDto, requestId: string): Promise<EnquiryDto> {
    return this.prisma.db.$transaction(async (tx) => {
      const current = await tx.enquiry.findUnique({ where: { id } });
      if (!current) throw new NotFoundException(NOT_FOUND);

      const change = enquiryStatusChange(current, dto.status, actor.id, new Date());
      if (!change) return toDto(await tx.enquiry.findUniqueOrThrow({ where: { id }, include }));

      const updated = await tx.enquiry.update({ where: { id }, data: change, include });
      // Status only: the audit log never copies the customer's message or contact details.
      await this.audit.log(
        {
          actorId: actor.id,
          action: 'enquiry.status.change',
          entityType: 'enquiry',
          entityId: id,
          before: { status: current.status },
          after: { status: updated.status },
          requestId,
        },
        tx,
      );
      return toDto(updated);
    });
  }
}

// ───────── Controller ─────────

@ApiTags('enquiries')
@ApiBearerAuth()
@Controller('enquiries')
export class EnquiriesController {
  constructor(private readonly inbox: EnquiriesInboxService) {}

  @Get()
  @RequirePermission('enquiries.read')
  @ApiOkResponse({ type: EnquiryPageDto })
  list(@Query() query: EnquiryQueryDto): Promise<EnquiryPageDto> {
    return this.inbox.list(query);
  }

  @Get(':id')
  @RequirePermission('enquiries.read')
  @ApiOkResponse({ type: EnquiryDto })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<EnquiryDto> {
    return this.inbox.get(id);
  }

  @Patch(':id')
  @RequirePermission('enquiries.write')
  @ApiOkResponse({ type: EnquiryDto })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEnquiryDto,
    @RequestId() requestId: string,
  ): Promise<EnquiryDto> {
    return this.inbox.update(user, id, dto, requestId);
  }
}
