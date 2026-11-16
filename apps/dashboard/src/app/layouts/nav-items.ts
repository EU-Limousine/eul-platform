import {
  CalendarCheck,
  CalendarClock,
  Car,
  LayoutDashboard,
  type LucideIcon,
  Radio,
  ScrollText,
  Tag,
  UserCog,
  Users,
} from 'lucide-react';

type AppPath = '/' | '/bookings' | '/dispatch' | '/spares' | '/drivers' | '/vehicles' | '/pricing' | '/users' | '/audit';

export interface NavItem {
  to: AppPath;
  labelKey: string;
  icon: LucideIcon;
  permission?: string; // shown only when the user has it (the API checks again)
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', labelKey: 'nav.overview', icon: LayoutDashboard },
  { to: '/bookings', labelKey: 'nav.bookings', icon: CalendarClock, permission: 'bookings.read' },
  { to: '/dispatch', labelKey: 'nav.dispatch', icon: Radio, permission: 'dispatch.assign' },
  { to: '/spares', labelKey: 'nav.spares', icon: CalendarCheck, permission: 'drivers.read' },
  { to: '/drivers', labelKey: 'nav.drivers', icon: Users, permission: 'drivers.read' },
  { to: '/vehicles', labelKey: 'nav.vehicles', icon: Car, permission: 'vehicles.read' },
  { to: '/pricing', labelKey: 'nav.pricing', icon: Tag, permission: 'pricing.read' },
  { to: '/users', labelKey: 'nav.users', icon: UserCog, permission: 'users.read' },
  { to: '/audit', labelKey: 'nav.audit', icon: ScrollText, permission: 'audit.read' },
];
