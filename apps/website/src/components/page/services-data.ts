import { Clock, Crown, Gem, Landmark, type LucideIcon, Plane, Route, Users } from 'lucide-react';

/**
 * The seven service pages (/services/[slug]). Texts live in messages → pages.services.items.<key>.
 * `vehicles` = vehicle class codes from the dashboard shown as "suitable vehicles".
 * `booking`: 'online' = priced in the booking flow; 'enquiry' = a form, because the booking flow
 * cannot price it yet (hourly hire, tours, large groups, multi-vehicle events).
 * Corporate travel has its own page: /business.
 */
export type ServicePageKey = 'airport' | 'hourly' | 'cityToCity' | 'vip' | 'events' | 'tours' | 'group';

export interface ServicePage {
  slug: string;
  key: ServicePageKey;
  icon: LucideIcon;
  image?: string;
  vehicles: string[];
  booking: 'online' | 'enquiry' | 'both';
}

const SEDANS = ['ELECTRIC', 'BUSINESS', 'FIRST'];
const VANS = ['PREMIUM_ELECTRIC_VAN', 'PREMIUM_MINIVAN'];
const GROUPS = ['GROUP_SHUTTLE', 'LUXURY_COACH'];
const S = '/images/site';

export const SERVICE_PAGES: ServicePage[] = [
  { slug: 'airport-transfers', key: 'airport', icon: Plane, image: `${S}/service-airport.jpg`, vehicles: [...SEDANS, ...VANS], booking: 'online' },
  { slug: 'hourly-chauffeur', key: 'hourly', icon: Clock, image: `${S}/service-hourly.jpg`, vehicles: [...SEDANS, ...VANS], booking: 'enquiry' },
  { slug: 'city-to-city', key: 'cityToCity', icon: Route, image: `${S}/about-noir.jpg`, vehicles: [...SEDANS, ...VANS], booking: 'online' },
  { slug: 'vip-chauffeur', key: 'vip', icon: Crown, image: `${S}/hero-noir.jpg`, vehicles: ['FIRST', 'ELECTRIC'], booking: 'online' },
  { slug: 'events-weddings', key: 'events', icon: Gem, image: `${S}/service-events.jpg`, vehicles: [...SEDANS, ...VANS], booking: 'both' },
  { slug: 'tours', key: 'tours', icon: Landmark, image: `${S}/gallery-2.jpg`, vehicles: [...SEDANS, ...VANS], booking: 'enquiry' },
  { slug: 'group-transport', key: 'group', icon: Users, image: `${S}/hero-classic.jpg`, vehicles: [...VANS, ...GROUPS], booking: 'both' },
];

export const servicePage = (slug: string) => SERVICE_PAGES.find((s) => s.slug === slug);
