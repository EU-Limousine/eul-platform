/**
 * Homepage content that is NOT translated text: which items to show, photos and real data.
 * Texts live in messages/<lang>.json under "home". Edit freely.
 *
 * DATA HONESTY (CLAUDE.md §6): stats, testimonials and partners must be REAL.
 * An empty list hides that section completely — never fill these with sample data.
 */
import {
  BadgeCheck,
  Briefcase,
  CalendarCheck,
  Car,
  Clock,
  CreditCard,
  Crown,
  Gem,
  Headphones,
  Lock,
  type LucideIcon,
  Plane,
  Route,
  ShieldCheck,
  Sparkles,
  Tag,
  UserCheck,
} from 'lucide-react';

const P = '/images/placeholders'; // TODO(content): replace placeholder photos with real, licensed photos

// ───────── Services ─────────
export const SERVICE_KEYS = ['airport', 'corporate', 'hourly', 'events', 'cityToCity', 'vip'] as const;
export type ServiceKey = (typeof SERVICE_KEYS)[number];

export const SERVICE_ICONS: Record<ServiceKey, LucideIcon> = {
  airport: Plane,
  corporate: Briefcase,
  hourly: Clock,
  events: Gem,
  cityToCity: Route,
  vip: Crown,
};

export const SERVICE_IMAGES: Partial<Record<ServiceKey, string>> = {
  airport: `${P}/service-airport.jpg`,
  corporate: `${P}/service-corporate.jpg`,
  events: `${P}/service-events.jpg`,
  hourly: `${P}/service-hourly.jpg`,
};

// ───────── Hero highlights (small icon row under the hero text) ─────────
export const HIGHLIGHTS = {
  classic: ['airport', 'chauffeurs', 'fixedPrice'],
  noir: ['punctual', 'chauffeurs', 'comfort', 'online'],
} as const;

export const HIGHLIGHT_ICONS: Record<string, LucideIcon> = {
  airport: Plane,
  chauffeurs: ShieldCheck,
  fixedPrice: Tag,
  punctual: Clock,
  comfort: Crown,
  online: CalendarCheck,
};

// ───────── How it works (matches the real booking flow) ─────────
export const STEP_KEYS = ['book', 'pay', 'chauffeur', 'ride'] as const;
export const STEP_ICONS: Record<(typeof STEP_KEYS)[number], LucideIcon> = {
  book: CalendarCheck,
  pay: CreditCard,
  chauffeur: UserCheck,
  ride: Car,
};

// ───────── Why choose us ─────────
export const FEATURE_KEYS = ['fleet', 'chauffeurs', 'discreet', 'punctual', 'pricing', 'support'] as const;
export const FEATURE_ICONS: Record<(typeof FEATURE_KEYS)[number], LucideIcon> = {
  fleet: Sparkles,
  chauffeurs: BadgeCheck,
  discreet: Lock,
  punctual: Clock,
  pricing: Tag,
  support: Headphones,
};

// ───────── About (option 2 side list) ─────────
export const ABOUT_POINTS = ['discreet', 'chauffeurs', 'fixedPrice', 'online'] as const;

// ───────── Real numbers only. Empty = section hidden. ─────────
// Example (only when TRUE): { key: 'years', value: '10+' }
export type StatKey = 'years' | 'clients' | 'rides' | 'cities' | 'rating';
export const STATS: { key: StatKey; value: string }[] = [];

// ───────── Real customer reviews only (with permission). Empty = section hidden. ─────────
export const TESTIMONIALS: { quote: string; name: string; role?: string; photo?: string; rating?: number }[] = [];

// ───────── Partner logos only with written permission. Empty = logos hidden. ─────────
export const PARTNERS: { name: string; logo: string; url?: string }[] = [];

// ───────── Photos ─────────
export const IMAGES = {
  classicHero: `${P}/classic-hero.jpg`,
  noirHero: `${P}/noir-hero.jpg`,
  classicAbout: `${P}/classic-about.jpg`,
  noirAbout: `${P}/noir-about.jpg`,
  classicHow: `${P}/classic-how.jpg`,
};

export const GALLERY: string[] = [1, 2, 3, 4, 5].map((n) => `${P}/gallery-${n}.jpg`);

/** Photo per vehicle class code (from the dashboard). Unknown codes use the first photo. */
export const FLEET_IMAGES: Record<string, string> = {
  BUSINESS: `${P}/fleet-1.jpg`,
  ELECTRIC: `${P}/fleet-1.jpg`,
  FIRST: `${P}/fleet-2.jpg`,
  PREMIUM_ELECTRIC_VAN: `${P}/fleet-4.jpg`,
  PREMIUM_MINIVAN: `${P}/fleet-4.jpg`,
  GROUP_SHUTTLE: `${P}/fleet-4.jpg`,
  LUXURY_COACH: `${P}/fleet-4.jpg`,
};
export const fleetImage = (code: string) => FLEET_IMAGES[code] ?? `${P}/fleet-1.jpg`;
