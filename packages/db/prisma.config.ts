import path from 'node:path';
import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Load the repo-root .env (scripts run from packages/db).
config({ path: path.resolve(process.cwd(), '../../.env'), quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // `prisma generate` (e.g. in Docker builds) needs no real database, only a valid URL.
    url: process.env.DATABASE_URL ?? 'postgresql://build:build@localhost:5432/build',
  },
});
