import { StaffRole } from '@eul/db';

/**
 * Role → permission map (CLAUDE.md §4.5). The only place roles are turned into permissions.
 * A user's permissions are the union of all their roles. Changing this is a code change + test.
 * The matrix is a proposal until management confirms it (D-24).
 */
export const PERMISSIONS = [
  'bookings.read',
  'bookings.write',
  'bookings.cancel',
  'dispatch.assign',
  'dispatch.spares.write',
  'dispatch.settings.write',
  'drivers.read',
  'drivers.write',
  'vehicles.read',
  'vehicles.write',
  'pricing.read',
  'pricing.write',
  'payments.read',
  'payments.refund',
  'notifications.read',
  'notifications.write',
  'content.write',
  'reports.read',
  'reports.read.basic',
  'audit.read',
  'users.read',
  'users.write',
  'roles.assign',
  'customers.read',
  'enquiries.read',
  'enquiries.write',
  'data.export',
  'system.read',
  'system.write',
  // Driver only, own records only
  'trips.read',
  'offers.respond',
  'trips.update',
  'location.send',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const DRIVER_ONLY: Permission[] = ['trips.read', 'offers.respond', 'trips.update', 'location.send'];

export const ROLE_PERMISSIONS: Record<StaffRole, readonly Permission[]> = {
  SUPER_ADMIN: PERMISSIONS.filter((p) => !DRIVER_ONLY.includes(p)),
  DEVELOPER: [
    'bookings.read',
    'dispatch.settings.write',
    'drivers.read',
    'drivers.write',
    'vehicles.read',
    'vehicles.write',
    'pricing.read',
    'payments.read',
    'notifications.read',
    'notifications.write',
    'content.write',
    'reports.read',
    'reports.read.basic',
    'audit.read',
    'users.read',
    'customers.read',
    'system.read',
    'system.write',
  ],
  ADMIN: [
    'bookings.read',
    'bookings.write',
    'bookings.cancel',
    'dispatch.assign',
    'dispatch.spares.write',
    'dispatch.settings.write',
    'drivers.read',
    'drivers.write',
    'vehicles.read',
    'vehicles.write',
    'pricing.read',
    'pricing.write',
    'payments.read',
    'payments.refund',
    'notifications.read',
    'notifications.write',
    'content.write',
    'reports.read',
    'reports.read.basic',
    'audit.read',
    'users.read',
    'users.write',
    'roles.assign',
    'customers.read',
    'enquiries.read',
    'enquiries.write',
    'data.export',
  ],
  DISPATCHER: [
    'bookings.read',
    'bookings.write',
    'bookings.cancel',
    'dispatch.assign',
    'dispatch.spares.write',
    'drivers.read',
    'vehicles.read',
    'pricing.read',
    'payments.read',
    'notifications.read',
    'reports.read.basic',
    'customers.read',
    'enquiries.read',
    'enquiries.write',
  ],
  DRIVER: DRIVER_ONLY,
};

/** Union of all roles' permissions, sorted for stable output. */
export function permissionsFor(roles: readonly StaffRole[]): Permission[] {
  const set = new Set<Permission>();
  for (const role of roles) for (const p of ROLE_PERMISSIONS[role]) set.add(p);
  return [...set].sort();
}

/** Which app a staff login is for. Driver app needs DRIVER; dashboard needs any other staff role. */
export type StaffApp = 'dashboard' | 'driver';

export function canUseApp(roles: readonly StaffRole[], app: StaffApp): boolean {
  if (app === 'driver') return roles.includes(StaffRole.DRIVER);
  return roles.some((role) => role !== StaffRole.DRIVER);
}
