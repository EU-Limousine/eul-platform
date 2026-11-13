import { BullModule } from '@nestjs/bullmq';
import { Controller, Get, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthCheck, HealthCheckService, PrismaHealthIndicator, TerminusModule } from '@nestjs/terminus';
import { LoggerModule } from 'nestjs-pino';
import { EmailProcessor } from './email/email.processor';
import { EmailSender } from './email/email-sender';
import { PrismaService } from './prisma.service';
import { QUEUE_EMAIL } from './queues';

const isDev = process.env.NODE_ENV !== 'production';

/** redis://[user:pass@]host:port → ioredis options. maxRetriesPerRequest: null is required by BullMQ. */
function redisConnection(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port || 6379),
    username: u.username || undefined,
    password: u.password ? decodeURIComponent(u.password) : undefined,
    tls: u.protocol === 'rediss:' ? {} : undefined,
    maxRetriesPerRequest: null,
  };
}

/** Cloud Run needs an HTTP port; GET /health also checks the database. */
@Controller('health')
class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([() => this.prismaHealth.pingCheck('database', this.prisma.db)]);
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: isDev ? 'debug' : 'info',
        transport: isDev ? { target: 'pino-pretty', options: { singleLine: true } } : undefined,
        autoLogging: false,
      },
    }),
    TerminusModule,
    BullModule.forRootAsync({
      useFactory: () => ({ connection: redisConnection(process.env.REDIS_URL ?? 'redis://localhost:6379') }),
    }),
    BullModule.registerQueue({ name: QUEUE_EMAIL }),
  ],
  controllers: [HealthController],
  providers: [PrismaService, EmailSender, EmailProcessor],
})
export class AppModule {}
