import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
  /** 'google' = Routes API; 'estimate' = straight line × road factor (dev only, no key). */
  source: 'google' | 'estimate';
}

const ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

// Dev fallback only. Not used for real prices: production requires GOOGLE_MAPS_SERVER_KEY.
const ROAD_FACTOR = 1.3;
const ESTIMATE_SPEED_KMH = 40;

export function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6_371_000;
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function estimateRoute(from: LatLng, to: LatLng): RouteResult {
  const distanceMeters = Math.round(haversineMeters(from, to) * ROAD_FACTOR);
  const durationSeconds = Math.round((distanceMeters / 1000 / ESTIMATE_SPEED_KMH) * 3600);
  return { distanceMeters, durationSeconds, source: 'estimate' };
}

@Injectable()
export class RouteService {
  private readonly logger = new Logger(RouteService.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  async route(from: LatLng, to: LatLng): Promise<RouteResult> {
    const key = this.config.get('GOOGLE_MAPS_SERVER_KEY', { infer: true });
    if (!key) return estimateRoute(from, to);

    const point = (p: LatLng) => ({ location: { latLng: { latitude: p.lat, longitude: p.lng } } });
    try {
      const res = await fetch(ROUTES_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': key,
          'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration',
        },
        body: JSON.stringify({ origin: point(from), destination: point(to), travelMode: 'DRIVE' }),
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) throw new Error(`Routes API HTTP ${res.status}`);
      const body = (await res.json()) as { routes?: { distanceMeters?: number; duration?: string }[] };
      const route = body.routes?.[0];
      if (!route?.distanceMeters || !route.duration) throw new Error('Routes API returned no route');
      return {
        distanceMeters: route.distanceMeters,
        durationSeconds: Math.round(Number.parseFloat(route.duration)), // "1234s"
        source: 'google',
      };
    } catch (error) {
      this.logger.warn(`Route lookup failed: ${String(error)}`);
      throw new ServiceUnavailableException({
        code: 'ROUTE_UNAVAILABLE',
        message: 'We could not calculate this route right now. Please try again.',
      });
    }
  }
}
