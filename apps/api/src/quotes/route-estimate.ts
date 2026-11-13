/** Pure distance maths (no Nest imports, so unit tests stay simple). */
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
