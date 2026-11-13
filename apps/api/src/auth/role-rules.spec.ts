import { StaffRole } from '@eul/db';
import { checkRoleChange } from './role-rules';

const superAdmin = { id: 'sa', roles: [StaffRole.SUPER_ADMIN] };
const admin = { id: 'ad', roles: [StaffRole.ADMIN] };
const dispatcher = { id: 'di', roles: [StaffRole.DISPATCHER] };

describe('checkRoleChange', () => {
  it('blocks changing your own roles, even as SUPER_ADMIN', () => {
    expect(checkRoleChange(superAdmin, 'sa', [StaffRole.DRIVER]).ok).toBe(false);
  });

  it('lets SUPER_ADMIN grant SUPER_ADMIN and DEVELOPER', () => {
    expect(checkRoleChange(superAdmin, 'x', [StaffRole.SUPER_ADMIN, StaffRole.DEVELOPER]).ok).toBe(true);
  });

  it('lets ADMIN grant only ADMIN, DISPATCHER, DRIVER', () => {
    expect(checkRoleChange(admin, 'x', [StaffRole.DISPATCHER, StaffRole.DRIVER, StaffRole.ADMIN]).ok).toBe(true);
    expect(checkRoleChange(admin, 'x', [StaffRole.DEVELOPER]).ok).toBe(false);
    expect(checkRoleChange(admin, 'x', [StaffRole.SUPER_ADMIN]).ok).toBe(false);
  });

  it('does not let DISPATCHER change roles', () => {
    expect(checkRoleChange(dispatcher, 'x', [StaffRole.DRIVER]).ok).toBe(false);
  });
});
