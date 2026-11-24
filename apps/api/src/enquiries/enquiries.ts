import { Body, Controller, HttpCode, Injectable, Logger, Module, Post, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiCreatedResponse, ApiHeader, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { EnquiryType } from '@eul/db';
import { Public } from '../auth/decorators';
import { TurnstileGuard } from '../common/turnstile.guard';
import type { Env } from '../config/env';
import { EmailQueue } from '../notifications/email-queue';
import { PrismaService } from '../prisma/prisma.service';
import { EnquiriesController, EnquiriesInboxService } from './enquiries-inbox';
import { renderEnquiryEmail } from './enquiry-email';

const LANGUAGES = ['en', 'da', 'de', 'fr', 'es', 'it', 'rm'] as const;
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const emptyToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || undefined : value;

// ───────── DTOs ─────────

export class CreateEnquiryDto {
  @ApiProperty({ enum: EnquiryType, enumName: 'EnquiryType' }) @IsEnum(EnquiryType) type!: EnquiryType;

  @ApiProperty() @Transform(trim) @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @ApiProperty() @Transform(trim) @IsEmail() @MaxLength(200) email!: string;

  @ApiPropertyOptional() @Transform(emptyToUndefined) @IsOptional() @Matches(/^\+?[0-9 ()-]{6,20}$/) phone?: string;
  @ApiPropertyOptional() @Transform(emptyToUndefined) @IsOptional() @IsString() @MaxLength(160) company?: string;

  @ApiPropertyOptional({ example: 'EUL-ABC123' })
  @Transform(emptyToUndefined)
  @IsOptional()
  @Matches(/^EUL-[A-Z0-9]{4,10}$/i)
  bookingReference?: string;

  @ApiPropertyOptional({ description: 'Where the form was sent from, e.g. "events-weddings"' })
  @Transform(emptyToUndefined)
  @IsOptional()
  @Matches(/^[a-z0-9-]{2,40}$/)
  topic?: string;

  @ApiProperty() @Transform(trim) @IsString() @MinLength(10) @MaxLength(4000) message!: string;

  @ApiPropertyOptional({ enum: LANGUAGES }) @IsOptional() @IsIn(LANGUAGES) language?: string;

  /** Honeypot: hidden on the website. Bots fill it; people never see it. */
  @ApiPropertyOptional({ description: 'Leave empty' }) @IsOptional() @IsString() @MaxLength(200) website?: string;
}

export class EnquiryCreatedDto {
  @ApiProperty() received!: boolean;
}

// ───────── Service ─────────

@Injectable()
export class EnquiriesService {
  private readonly logger = new Logger(EnquiriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emails: EmailQueue,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async create(dto: CreateEnquiryDto): Promise<EnquiryCreatedDto> {
    // Bot filled the hidden field: answer like a success so it learns nothing.
    if (dto.website) return { received: true };

    const enquiry = await this.prisma.db.enquiry.create({
      data: {
        type: dto.type,
        name: dto.name,
        email: dto.email.toLowerCase(),
        phone: dto.phone,
        company: dto.company,
        bookingReference: dto.bookingReference?.toUpperCase(),
        topic: dto.topic,
        message: dto.message,
        language: dto.language ?? 'en',
      },
    });

    const to = this.config.get('ENQUIRY_EMAIL', { infer: true });
    if (to) {
      const mail = renderEnquiryEmail(enquiry);
      await this.emails.add({ to, ...mail, template: 'enquiry-staff' }, `enquiry-${enquiry.id}`);
    } else {
      this.logger.warn('ENQUIRY_EMAIL is not set: enquiry stored without a staff email');
    }
    return { received: true };
  }
}

// ───────── Controller ─────────

@ApiTags('public')
@Controller()
export class PublicEnquiriesController {
  constructor(private readonly enquiries: EnquiriesService) {}

  /** Contact, business and event/group forms on the website. */
  @Post('public/enquiries')
  @Public()
  @UseGuards(TurnstileGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(201)
  @ApiHeader({ name: 'x-turnstile-token', required: false })
  @ApiCreatedResponse({ type: EnquiryCreatedDto })
  create(@Body() dto: CreateEnquiryDto): Promise<EnquiryCreatedDto> {
    return this.enquiries.create(dto);
  }
}

/** Website forms (public) + the dashboard inbox (staff, enquiries.* permissions). */
@Module({
  controllers: [PublicEnquiriesController, EnquiriesController],
  providers: [EnquiriesService, EnquiriesInboxService],
})
export class EnquiriesModule {}
