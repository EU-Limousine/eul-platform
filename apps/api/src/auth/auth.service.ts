import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import argon2 from 'argon2';
import type { StaffRole } from '@eul/db';
import type { Env } from '../config/env';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import type { MeDto, TokenResponseDto } from './dto/auth.dto';
import { STAFF_AUDIENCE } from './jwt.strategy';
import { canUseApp, permissionsFor, type StaffApp } from './permissions';

const INVALID_LOGIN = { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' };
const INVALID_SESSION = { code: 'SESSION_EXPIRED', message: 'Your session has expired. Please log in again.' };

const hashToken = (raw: string) => createHash('sha256').update(raw).digest('hex');

export interface IssuedTokens {
  body: TokenResponseDto;
  refreshToken: string;
  refreshExpiresAt: Date;
}

@Injectable()
export class AuthService {
  private dummyHash?: Promise<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly audit: AuditService,
  ) {}

  async login(email: string, password: string, app: StaffApp, userAgent?: string): Promise<IssuedTokens> {
    const user = await this.prisma.db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { roles: true },
    });

    // Verify against a dummy hash when the user is unknown, so timing does not reveal valid emails.
    this.dummyHash ??= argon2.hash(randomUUID());
    const passwordOk = await argon2.verify(user?.passwordHash ?? (await this.dummyHash), password);
    if (!user || !passwordOk || !user.isActive) throw new UnauthorizedException(INVALID_LOGIN);

    const roles = user.roles.map((r) => r.role);
    if (!canUseApp(roles, app)) {
      throw new ForbiddenException({ code: 'APP_NOT_ALLOWED', message: 'Your account cannot use this app.' });
    }

    await this.prisma.db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await this.audit.log({ actorId: user.id, action: 'auth.login', entityType: 'user', entityId: user.id, after: { app } });
    return this.issue({ id: user.id, email: user.email, name: user.name, roles }, randomUUID(), userAgent);
  }

  /** Rotates the refresh token. Reusing an old token revokes the whole login family. */
  async refresh(rawToken: string | undefined, userAgent?: string): Promise<IssuedTokens> {
    if (!rawToken) throw new UnauthorizedException(INVALID_SESSION);
    const stored = await this.prisma.db.refreshToken.findUnique({ where: { tokenHash: hashToken(rawToken) } });
    if (!stored) throw new UnauthorizedException(INVALID_SESSION);

    // Mark as used only if nobody used it before (atomic). 0 rows = reuse → revoke the family.
    const marked = await this.prisma.db.refreshToken.updateMany({
      where: { id: stored.id, usedAt: null, revokedAt: null },
      data: { usedAt: new Date() },
    });
    if (marked.count === 0) {
      await this.revokeFamily(stored.familyId);
      throw new UnauthorizedException(INVALID_SESSION);
    }
    if (stored.expiresAt < new Date()) throw new UnauthorizedException(INVALID_SESSION);

    const user = await this.prisma.db.user.findUnique({ where: { id: stored.userId }, include: { roles: true } });
    if (!user?.isActive) throw new UnauthorizedException(INVALID_SESSION);

    const roles = user.roles.map((r) => r.role);
    return this.issue({ id: user.id, email: user.email, name: user.name, roles }, stored.familyId, userAgent);
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    const stored = await this.prisma.db.refreshToken.findUnique({ where: { tokenHash: hashToken(rawToken) } });
    if (stored) await this.revokeFamily(stored.familyId);
  }

  async me(userId: string): Promise<MeDto> {
    const user = await this.prisma.db.user.findUnique({ where: { id: userId }, include: { roles: true } });
    if (!user?.isActive) throw new UnauthorizedException(INVALID_SESSION);
    const roles = user.roles.map((r) => r.role);
    return { id: user.id, email: user.email, name: user.name, roles, permissions: permissionsFor(roles) };
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.db.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issue(
    user: { id: string; email: string; name: string; roles: StaffRole[] },
    familyId: string,
    userAgent?: string,
  ): Promise<IssuedTokens> {
    const expiresIn = this.config.get('JWT_ACCESS_TTL', { infer: true });
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, roles: user.roles },
      { audience: STAFF_AUDIENCE, expiresIn },
    );

    const refreshToken = randomBytes(32).toString('base64url');
    const ttlDays = this.config.get('REFRESH_TTL_DAYS', { infer: true });
    const refreshExpiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
    await this.prisma.db.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        familyId,
        expiresAt: refreshExpiresAt,
        userAgent: userAgent?.slice(0, 300),
      },
    });

    return {
      body: {
        accessToken,
        expiresIn,
        user: { ...user, permissions: permissionsFor(user.roles) },
      },
      refreshToken,
      refreshExpiresAt,
    };
  }
}
