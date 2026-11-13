import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, RequirePermission, type AuthUser } from '../auth/decorators';
import { PageQueryDto } from '../common/page-query.dto';
import { RequestId } from '../common/request-id.decorator';
import { CreateUserDto, SetRolesDto, UserDto, UserPageDto } from './dto/users.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermission('users.read')
  @ApiOkResponse({ type: UserPageDto })
  list(@Query() query: PageQueryDto): Promise<UserPageDto> {
    return this.users.list(query);
  }

  @Post()
  @RequirePermission('users.write')
  @ApiOkResponse({ type: UserDto })
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateUserDto, @RequestId() requestId: string): Promise<UserDto> {
    return this.users.create(actor, dto, requestId);
  }

  @Put(':id/roles')
  @RequirePermission('roles.assign')
  @ApiOkResponse({ type: UserDto })
  setRoles(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetRolesDto,
    @RequestId() requestId: string,
  ): Promise<UserDto> {
    return this.users.setRoles(actor, id, dto.roles, requestId);
  }

  @Post(':id/deactivate')
  @RequirePermission('users.write')
  @ApiOkResponse({ type: UserDto })
  deactivate(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @RequestId() requestId: string,
  ): Promise<UserDto> {
    return this.users.deactivate(actor, id, requestId);
  }
}
