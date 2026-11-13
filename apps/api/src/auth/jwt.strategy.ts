import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { StaffRole } from '@eul/db';
import type { Env } from '../config/env';
import type { AuthUser } from './decorators';
import { permissionsFor } from './permissions';

export const STAFF_AUDIENCE = 'staff';

interface StaffTokenPayload {
  sub: string;
  roles: StaffRole[];
}

/** Staff tokens only (audience "staff"). Customer tokens (Phase 2) use a separate strategy. */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService<Env, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('JWT_ACCESS_SECRET', { infer: true }),
      audience: STAFF_AUDIENCE,
      ignoreExpiration: false,
    });
  }

  validate(payload: StaffTokenPayload): AuthUser {
    return { id: payload.sub, roles: payload.roles, permissions: permissionsFor(payload.roles) };
  }
}
