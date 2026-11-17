import type { PublicCategoryDto } from '@eul/api-client';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');

/** Currency for prices shown on a page: Danish pages DKK, others the configured default. */
export function pageCurrency(locale: string): 'DKK' | 'EUR' | 'USD' {
  if (locale === 'da') return 'DKK';
  const configured = process.env.NEXT_PUBLIC_DEFAULT_CURRENCY;
  return configured === 'DKK' || configured === 'USD' ? configured : 'EUR';
}

/**
 * Vehicle classes for the fleet section, refreshed every 5 minutes.
 * If the API is unreachable (e.g. during a Docker build) the section is simply hidden.
 */
export async function fetchPublicCategories(locale: string): Promise<PublicCategoryDto[]> {
  try {
    const res = await fetch(`${API_URL}/public/vehicle-categories?currency=${pageCurrency(locale)}`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(5_000),
    });
    return res.ok ? ((await res.json()) as PublicCategoryDto[]) : [];
  } catch {
    return [];
  }
}
