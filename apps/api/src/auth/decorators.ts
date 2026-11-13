import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { StaffRole } from '@eul/db';
import type { Permission } from './permissions';

export const IS_PUBLIC = 'isPublic';
export const REQUIRED_PERMISSIONS = 'requiredPermissions';

/** Route needs no login. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Route needs every listed permission. */
export const RequirePermission = (...permissions: Permission[]) =>
  SetMetadata(REQUIRED_PERMISSIONS, permissions);

/** The logged-in staff user, as set by JwtStrategy.validate(). */
export interface AuthUser {
  id: string;
  roles: StaffRole[];
  permissions: Permission[];
}

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  return ctx.switchToHttp().getRequest<{ user: AuthUser }>().user;
});
