import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, RequirePermission, type AuthUser } from '../auth/decorators';
import { RequestId } from '../common/request-id.decorator';
import { AssignmentService } from './assignment.service';
import { BookingsService } from './bookings.service';
import {
  AssignDriverDto,
  BookingDetailDto,
  BookingPageDto,
  BookingQueryDto,
  DriverCandidateDto,
} from './dto/bookings.dto';

@ApiTags('bookings')
@ApiBearerAuth()
@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookings: BookingsService,
    private readonly assignment: AssignmentService,
  ) {}

  @Get()
  @RequirePermission('bookings.read')
  @ApiOkResponse({ type: BookingPageDto })
  list(@Query() query: BookingQueryDto): Promise<BookingPageDto> {
    return this.bookings.list(query);
  }

  @Get(':id')
  @RequirePermission('bookings.read', 'customers.read')
  @ApiOkResponse({ type: BookingDetailDto })
  detail(@Param('id', ParseUUIDPipe) id: string): Promise<BookingDetailDto> {
    return this.bookings.detail(id);
  }

  @Get(':id/driver-candidates')
  @RequirePermission('dispatch.assign', 'drivers.read')
  @ApiOkResponse({ type: [DriverCandidateDto] })
  candidates(@Param('id', ParseUUIDPipe) id: string): Promise<DriverCandidateDto[]> {
    return this.assignment.candidates(id);
  }

  /** 409 RIDE_NOT_AVAILABLE when the booking was already assigned, cancelled or finished. */
  @Post(':id/assign')
  @HttpCode(200)
  @RequirePermission('dispatch.assign')
  @ApiOkResponse({ type: BookingDetailDto })
  async assign(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignDriverDto,
    @RequestId() requestId: string,
  ): Promise<BookingDetailDto> {
    await this.assignment.assignManually(user, id, dto, requestId);
    return this.bookings.detail(id);
  }
}
