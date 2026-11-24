import { StaffRole } from '@eul/db';
import { canUseApp, permissionsFor, ROLE_PERMISSIONS } from './permissions';

describe('permissionsFor', () => {
  it('merges permissions of several roles (union)', () => {
    const perms = permissionsFor([StaffRole.DRIVER, StaffRole.DISPATCHER]);
    expect(perms).toContain('offers.respond');
    expect(perms).toContain('dispatch.assign');
  });

  it('gives DEVELOPER no money, people or live-operation permissions', () => {
    const dev = ROLE_PERMISSIONS.DEVELOPER;
    for (const p of [
      'bookings.write',
      'bookings.cancel',
      'dispatch.assign',
      'dispatch.spares.write',
      'pricing.write',
      'payments.refund',
      'users.write',
      'roles.assign',
      'data.export',
      'enquiries.read',
      'enquiries.write',
    ] as const) {
      expect(dev).not.toContain(p);
    }
    expect(dev).toContain('system.write');
  });

  it('keeps driver-only permissions away from SUPER_ADMIN', () => {
    expect(ROLE_PERMISSIONS.SUPER_ADMIN).not.toContain('offers.respond');
    expect(ROLE_PERMISSIONS.SUPER_ADMIN).toContain('roles.assign');
  });

  it('does not let DISPATCHER refund or change pricing', () => {
    const perms = permissionsFor([StaffRole.DISPATCHER]);
    expect(perms).not.toContain('payments.refund');
    expect(perms).not.toContain('pricing.write');
  });
});

describe('enquiries (website messages: personal data)', () => {
  it('lets ADMIN and DISPATCHER read and handle them', () => {
    for (const role of [StaffRole.ADMIN, StaffRole.DISPATCHER, StaffRole.SUPER_ADMIN]) {
      expect(ROLE_PERMISSIONS[role]).toEqual(expect.arrayContaining(['enquiries.read', 'enquiries.write']));
    }
  });

  it('keeps them away from DRIVER', () => {
    expect(ROLE_PERMISSIONS.DRIVER).not.toContain('enquiries.read');
  });
});

describe('canUseApp', () => {
  it('driver app needs DRIVER', () => {
    expect(canUseApp([StaffRole.DRIVER], 'driver')).toBe(true);
    expect(canUseApp([StaffRole.DISPATCHER], 'driver')).toBe(false);
  });

  it('dashboard needs a staff role other than DRIVER', () => {
    expect(canUseApp([StaffRole.DRIVER], 'dashboard')).toBe(false);
    expect(canUseApp([StaffRole.DRIVER, StaffRole.DISPATCHER], 'dashboard')).toBe(true);
  });
});
