import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, RequirePermission, type AuthUser } from '../auth/decorators';
import { RequestId } from '../common/request-id.decorator';
import {
  CreateVehicleCategoryDto,
  CreateVehicleDto,
  UpdateVehicleCategoryDto,
  UpdateVehicleDto,
  VehicleCategoryDto,
  VehicleDto,
  VehiclePageDto,
  VehicleQueryDto,
} from './dto/vehicles.dto';
import { VehiclesService } from './vehicles.service';

@ApiTags('vehicles')
@ApiBearerAuth()
@Controller()
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}

  @Get('vehicle-categories')
  @RequirePermission('vehicles.read')
  @ApiOkResponse({ type: [VehicleCategoryDto] })
  listCategories(): Promise<VehicleCategoryDto[]> {
    return this.vehicles.listCategories();
  }

  @Post('vehicle-categories')
  @RequirePermission('vehicles.write')
  @ApiOkResponse({ type: VehicleCategoryDto })
  createCategory(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateVehicleCategoryDto,
    @RequestId() requestId: string,
  ): Promise<VehicleCategoryDto> {
    return this.vehicles.createCategory(user.id, dto, requestId);
  }

  @Patch('vehicle-categories/:id')
  @RequirePermission('vehicles.write')
  @ApiOkResponse({ type: VehicleCategoryDto })
  updateCategory(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVehicleCategoryDto,
    @RequestId() requestId: string,
  ): Promise<VehicleCategoryDto> {
    return this.vehicles.updateCategory(user.id, id, dto, requestId);
  }

  @Get('vehicles')
  @RequirePermission('vehicles.read')
  @ApiOkResponse({ type: VehiclePageDto })
  listVehicles(@Query() query: VehicleQueryDto): Promise<VehiclePageDto> {
    return this.vehicles.listVehicles(query);
  }

  @Get('vehicles/:id')
  @RequirePermission('vehicles.read')
  @ApiOkResponse({ type: VehicleDto })
  getVehicle(@Param('id', ParseUUIDPipe) id: string): Promise<VehicleDto> {
    return this.vehicles.getVehicle(id);
  }

  @Post('vehicles')
  @RequirePermission('vehicles.write')
  @ApiOkResponse({ type: VehicleDto })
  createVehicle(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateVehicleDto,
    @RequestId() requestId: string,
  ): Promise<VehicleDto> {
    return this.vehicles.createVehicle(user.id, dto, requestId);
  }

  @Patch('vehicles/:id')
  @RequirePermission('vehicles.write')
  @ApiOkResponse({ type: VehicleDto })
  updateVehicle(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVehicleDto,
    @RequestId() requestId: string,
  ): Promise<VehicleDto> {
    return this.vehicles.updateVehicle(user.id, id, dto, requestId);
  }
}
