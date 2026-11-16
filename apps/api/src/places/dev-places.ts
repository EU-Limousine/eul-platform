/**
 * DEV ONLY: a few well-known Copenhagen places (public coordinates) so the booking flow
 * can be tested before GOOGLE_MAPS_SERVER_KEY is set. Never used when the key exists,
 * and production refuses to start without the key.
 */
export interface DevPlace {
  placeId: string;
  mainText: string;
  secondaryText: string;
  lat: number;
  lng: number;
}

export const DEV_PLACES: DevPlace[] = [
  { placeId: 'dev-cph-airport', mainText: 'Copenhagen Airport (CPH)', secondaryText: 'Kastrup, Denmark', lat: 55.618, lng: 12.6476 },
  { placeId: 'dev-central-station', mainText: 'Copenhagen Central Station', secondaryText: 'Copenhagen, Denmark', lat: 55.6727, lng: 12.5644 },
  { placeId: 'dev-nyhavn', mainText: 'Nyhavn', secondaryText: 'Copenhagen, Denmark', lat: 55.6798, lng: 12.5911 },
  { placeId: 'dev-tivoli', mainText: 'Tivoli Gardens', secondaryText: 'Copenhagen, Denmark', lat: 55.6737, lng: 12.5681 },
  { placeId: 'dev-amalienborg', mainText: 'Amalienborg', secondaryText: 'Copenhagen, Denmark', lat: 55.684, lng: 12.5933 },
  { placeId: 'dev-malmo-central', mainText: 'Malmö Central Station', secondaryText: 'Malmö, Sweden', lat: 55.6091, lng: 13.0007 },
];

export function searchDevPlaces(query: string): DevPlace[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return DEV_PLACES.filter((p) => `${p.mainText} ${p.secondaryText}`.toLowerCase().includes(q)).slice(0, 5);
}
