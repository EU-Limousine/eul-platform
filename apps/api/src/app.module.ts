import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AuditModule } from './audit/audit.service';
import { JwtAuthGuard, PermissionsGuard } from './auth/guards';
import { AuthModule } from './auth/auth.module';
import { ErrorFilter } from './common/error.filter';
import { validateEnv } from './config/env';
import { HealthModule } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.service';
import { UsersModule } from './users/users.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { DriversModule } from './drivers/drivers.module';
import { PricingModule } from './pricing/pricing.module';

const isDev = process.env.NODE_ENV !== 'production';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv, envFilePath: ['../../.env', '.env'] }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: isDev ? 'debug' : 'info',
        genReqId: (req, res) => {
          const header = req.headers['x-request-id'];
          const id = typeof header === 'string' && header.length <= 100 ? header : randomUUID();
          res.setHeader('x-request-id', id);
          return id;
        },
        // Never log tokens, cookies or personal data.
        redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
        transport: isDev ? { target: 'pino-pretty', options: { singleLine: true } } : undefined,
        autoLogging: { ignore: (req) => req.url === '/health' },
      },
    }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 300 }]),
    PrismaModule,
    AuditModule,
    HealthModule,
    AuthModule,
    UsersModule,
    VehiclesModule,
    DriversModule,
    PricingModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: ErrorFilter },
    // Order matters: rate limit → authenticate → check permissions.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
