import { Global, Injectable, Module } from '@nestjs/common';
import type { Prisma } from '@eul/db';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  actorId?: string | null;
  actorLabel?: string; // "system", "AI on behalf of <user>"
  action: string; // e.g. "booking.assign", "user.roles.change"
  entityType: string;
  entityId?: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  requestId?: string;
}

/** Write one audit row. Pass `tx` to write inside the same transaction as the change. */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditEntry, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma.db;
    await client.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        actorLabel: entry.actorLabel,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        before: entry.before,
        after: entry.after,
        requestId: entry.requestId,
      },
    });
  }
}

@Global()
@Module({ providers: [AuditService], exports: [AuditService] })
export class AuditModule {}
