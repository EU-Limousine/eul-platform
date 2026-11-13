import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';

export * from './generated/prisma/client.js';

/** One client per process. Pool size per instance comes from DB_POOL_MAX. */
export function createPrismaClient(databaseUrl = process.env.DATABASE_URL): PrismaClient {
  if (!databaseUrl) throw new Error('DATABASE_URL is not set');
  const adapter = new PrismaPg({
    connectionString: databaseUrl,
    max: Number(process.env.DB_POOL_MAX ?? 5),
  });
  return new PrismaClient({ adapter });
}
