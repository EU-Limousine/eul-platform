/**
 * The overview's only contact with the API (Orval hook from `npm run api:generate`).
 * If the generated name differs, fix it here only.
 */
import { useOverviewGet, type OverviewDto } from '@eul/api-client';
import { useCan } from '@/features/auth/can';

export type Overview = OverviewDto;

// Polls until live sockets arrive (phase 1E); also feeds the topbar bell.
const REFRESH_MS = 30_000;

export function useOverview() {
  const allowed = useCan('bookings.read');
  return useOverviewGet({ query: { enabled: allowed, refetchInterval: REFRESH_MS } });
}
