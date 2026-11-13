import path from 'node:path';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  output: 'standalone',
  // Monorepo: trace files from the repo root so the standalone build includes workspace packages.
  // (Next runs with apps/website as the working directory.)
  outputFileTracingRoot: path.resolve(process.cwd(), '../../'),
  transpilePackages: ['@eul/i18n', '@eul/ui'],
  poweredByHeader: false,
  images: { formats: ['image/avif', 'image/webp'] },
};

export default withNextIntl(nextConfig);
