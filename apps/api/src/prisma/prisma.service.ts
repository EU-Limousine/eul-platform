import { Global, Injectable, Module, OnModuleDestroy } from '@nestjs/common';
import { createPrismaClient, type PrismaClient } from '@eul/db';

/** Use as `this.prisma.db.<model>`. One pool per instance (DB_POOL_MAX). */
@Injectable()
export class PrismaService implements OnModuleDestroy {
  readonly db: PrismaClient = createPrismaClient();

  async onModuleDestroy(): Promise<void> {
    await this.db.$disconnect();
  }
}

@Global()
@Module({ providers: [PrismaService], exports: [PrismaService] })
export class PrismaModule {}
