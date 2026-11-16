/**
 * Website → API calls for booking. Types come from the generated API client (never hand-written);
 * only `import type` is used, so no client library code ships to the browser.
 */
import type {
  CheckoutCreatedDto,
  CheckoutStatusDto,
  CreateCheckoutDto,
  CreateQuoteDto,
  PlaceDetailsDto,
  PlaceSuggestionDto,
  QuoteResponseDto,
} from '@eul/api-client';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');

export class BookingApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init.headers as Record<string, string> | undefined) },
    });
  } catch {
    throw new BookingApiError(0, 'NETWORK', 'No connection. Please check your internet and try again.');
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { code?: string; message?: string; fieldErrors?: Record<string, string[]> };
    throw new BookingApiError(res.status, body.code ?? 'ERROR', body.message ?? 'Something went wrong. Please try again.', body.fieldErrors);
  }
  return (await res.json()) as T;
}

export function searchPlaces(q: string, session: string, lang: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ q, session, lang });
  return call<PlaceSuggestionDto[]>(`/public/places/autocomplete?${params}`, { signal });
}

export function placeDetails(placeId: string, session: string, lang: string) {
  const params = new URLSearchParams({ session, lang });
  return call<PlaceDetailsDto>(`/public/places/${encodeURIComponent(placeId)}?${params}`);
}

// TODO(go-live): send the Cloudflare Turnstile token in `x-turnstile-token` (site key per environment).
export function getQuote(body: CreateQuoteDto) {
  return call<QuoteResponseDto>('/public/quotes', { method: 'POST', body: JSON.stringify(body) });
}

export function createCheckout(body: CreateCheckoutDto, idempotencyKey: string) {
  return call<CheckoutCreatedDto>('/public/checkouts', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Idempotency-Key': idempotencyKey },
  });
}

export function checkoutStatus(checkoutId: string) {
  return call<CheckoutStatusDto>(`/public/checkouts/${encodeURIComponent(checkoutId)}`);
}
