import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, RequirePermission, type AuthUser } from '../auth/decorators';
import { RequestId } from '../common/request-id.decorator';
import { CreateDriverDto, DriverDto, DriverPageDto, DriverQueryDto, UpdateDriverDto } from './dto/drivers.dto';
import { DriversService } from './drivers.service';

@ApiTags('drivers')
@ApiBearerAuth()
@Controller('drivers')
export class DriversController {
  constructor(private readonly drivers: DriversService) {}

  @Get()
  @RequirePermission('drivers.read')
  @ApiOkResponse({ type: DriverPageDto })
  list(@Query() query: DriverQueryDto): Promise<DriverPageDto> {
    return this.drivers.list(query);
  }

  @Get(':id')
  @RequirePermission('drivers.read')
  @ApiOkResponse({ type: DriverDto })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<DriverDto> {
    return this.drivers.get(id);
  }

  /** Creates a login account, so it needs users.write as well as drivers.write. */
  @Post()
  @RequirePermission('drivers.write', 'users.write')
  @ApiOkResponse({ type: DriverDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateDriverDto, @RequestId() requestId: string): Promise<DriverDto> {
    return this.drivers.create(user, dto, requestId);
  }

  @Patch(':id')
  @RequirePermission('drivers.write')
  @ApiOkResponse({ type: DriverDto })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDriverDto,
    @RequestId() requestId: string,
  ): Promise<DriverDto> {
    return this.drivers.update(user.id, id, dto, requestId);
  }
}
