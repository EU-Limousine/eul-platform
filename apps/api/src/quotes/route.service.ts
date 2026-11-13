import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env';
import { estimateRoute, type LatLng, type RouteResult } from './route-estimate';

export type { LatLng, RouteResult } from './route-estimate';

const ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

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
