import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import argon2 from 'argon2';
import { StaffRole, type Prisma } from '@eul/db';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../auth/decorators';
import { checkRoleChange } from '../auth/role-rules';
import { PrismaService } from '../prisma/prisma.service';
import type { PageQueryDto } from '../common/page-query.dto';
import type { CreateUserDto, UserDto, UserPageDto } from './dto/users.dto';

type UserWithRoles = Prisma.UserGetPayload<{ include: { roles: true } }>;

function toDto(user: UserWithRoles): UserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    isActive: user.isActive,
    roles: user.roles.map((r) => r.role),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: PageQueryDto): Promise<UserPageDto> {
    const [items, total] = await this.prisma.db.$transaction([
      this.prisma.db.user.findMany({
        include: { roles: true },
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.pageSize,
      }),
      this.prisma.db.user.count(),
    ]);
    return { items: items.map(toDto), total, page: query.page, pageSize: query.pageSize };
  }

  async create(actor: AuthUser, dto: CreateUserDto, requestId: string): Promise<UserDto> {
    if (dto.roles.length === 0) throw new BadRequestException({ code: 'ROLE_REQUIRED', message: 'Give the user at least one role.' });
    this.assertRoleChange(actor, '', dto.roles);

    const email = dto.email.toLowerCase().trim();
    if (await this.prisma.db.user.findUnique({ where: { email } })) {
      throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'A user with this email already exists.' });
    }

    const user = await this.prisma.db.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          name: dto.name,
          phone: dto.phone,
          passwordHash: await argon2.hash(dto.password),
          roles: { create: dto.roles.map((role) => ({ role, grantedById: actor.id })) },
        },
        include: { roles: true },
      });
      await this.audit.log(
        { actorId: actor.id, action: 'user.create', entityType: 'user', entityId: created.id, after: { email, roles: dto.roles }, requestId },
        tx,
      );
      return created;
    });
    return toDto(user);
  }

  /** Replace a user's roles. Enforces the role-grant rules and the last-super-admin rule. */
  async setRoles(actor: AuthUser, userId: string, roles: StaffRole[], requestId: string): Promise<UserDto> {
    const user = await this.findOrThrow(userId);
    const current = user.roles.map((r) => r.role);
    const added = roles.filter((r) => !current.includes(r));
    const removed = current.filter((r) => !roles.includes(r));
    this.assertRoleChange(actor, userId, [...added, ...removed]);
    if (roles.length === 0) throw new BadRequestException({ code: 'ROLE_REQUIRED', message: 'Give the user at least one role.' });
    if (removed.includes(StaffRole.SUPER_ADMIN)) await this.assertNotLastSuperAdmin(userId);

    const updated = await this.prisma.db.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId, role: { in: removed } } });
      await tx.userRole.createMany({ data: added.map((role) => ({ userId, role, grantedById: actor.id })) });
      await this.audit.log(
        { actorId: actor.id, action: 'user.roles.change', entityType: 'user', entityId: userId, before: { roles: current }, after: { roles }, requestId },
        tx,
      );
      return tx.user.findUniqueOrThrow({ where: { id: userId }, include: { roles: true } });
    });
    return toDto(updated);
  }

  /** Deactivate a user and end all their sessions immediately. */
  async deactivate(actor: AuthUser, userId: string, requestId: string): Promise<UserDto> {
    if (actor.id === userId) throw new ForbiddenException({ code: 'SELF_DEACTIVATE', message: 'You cannot deactivate yourself.' });
    const user = await this.findOrThrow(userId);
    if (user.roles.some((r) => r.role === StaffRole.SUPER_ADMIN)) {
      this.assertRoleChange(actor, userId, [StaffRole.SUPER_ADMIN]);
      await this.assertNotLastSuperAdmin(userId);
    }

    const updated = await this.prisma.db.$transaction(async (tx) => {
      const result = await tx.user.update({ where: { id: userId }, data: { isActive: false }, include: { roles: true } });
      await tx.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
      await this.audit.log(
        { actorId: actor.id, action: 'user.deactivate', entityType: 'user', entityId: userId, before: { isActive: true }, after: { isActive: false }, requestId },
        tx,
      );
      return result;
    });
    return toDto(updated);
  }

  private async findOrThrow(userId: string): Promise<UserWithRoles> {
    const user = await this.prisma.db.user.findUnique({ where: { id: userId }, include: { roles: true } });
    if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found.' });
    return user;
  }

  private assertRoleChange(actor: AuthUser, targetUserId: string, changed: StaffRole[]): void {
    const check = checkRoleChange(actor, targetUserId, changed);
    if (!check.ok) throw new ForbiddenException({ code: 'ROLE_CHANGE_NOT_ALLOWED', message: check.reason });
  }

  private async assertNotLastSuperAdmin(userId: string): Promise<void> {
    const others = await this.prisma.db.user.count({
      where: { id: { not: userId }, isActive: true, roles: { some: { role: StaffRole.SUPER_ADMIN } } },
    });
    if (others === 0) {
      throw new ConflictException({ code: 'LAST_SUPER_ADMIN', message: 'The last active Super Admin cannot be removed.' });
    }
  }
}
