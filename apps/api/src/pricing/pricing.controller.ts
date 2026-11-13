import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, RequirePermission, type AuthUser } from '../auth/decorators';
import { RequestId } from '../common/request-id.decorator';
import {
  CreatePricingRuleDto,
  PriceBreakdownDto,
  PricePreviewQueryDto,
  PricingRuleDto,
  UpdatePricingRuleDto,
} from './dto/pricing.dto';
import { PricingService } from './pricing.service';

@ApiTags('pricing')
@ApiBearerAuth()
@Controller('pricing/rules')
export class PricingController {
  constructor(private readonly pricing: PricingService) {}

  @Get()
  @RequirePermission('pricing.read')
  @ApiOkResponse({ type: [PricingRuleDto] })
  list(): Promise<PricingRuleDto[]> {
    return this.pricing.list();
  }

  @Post()
  @RequirePermission('pricing.write')
  @ApiOkResponse({ type: PricingRuleDto })
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePricingRuleDto,
    @RequestId() requestId: string,
  ): Promise<PricingRuleDto> {
    return this.pricing.create(user.id, dto, requestId);
  }

  @Patch(':id')
  @RequirePermission('pricing.write')
  @ApiOkResponse({ type: PricingRuleDto })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePricingRuleDto,
    @RequestId() requestId: string,
  ): Promise<PricingRuleDto> {
    return this.pricing.update(user.id, id, dto, requestId);
  }

  @Get(':id/preview')
  @RequirePermission('pricing.read')
  @ApiOkResponse({ type: PriceBreakdownDto })
  preview(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PricePreviewQueryDto,
  ): Promise<PriceBreakdownDto> {
    return this.pricing.preview(id, query.distanceMeters, query.durationSeconds);
  }
}
