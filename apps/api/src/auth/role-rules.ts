import { StaffRole } from '@eul/db';

const ADMIN_GRANTABLE: StaffRole[] = [StaffRole.ADMIN, StaffRole.DISPATCHER, StaffRole.DRIVER];

export type RoleChangeCheck = { ok: true } | { ok: false; reason: string };

/**
 * May `actor` grant or remove `changedRoles` on `targetUserId`? (CLAUDE.md §4.5)
 * - Nobody changes their own roles.
 * - SUPER_ADMIN may change any role.
 * - ADMIN may change only ADMIN, DISPATCHER, DRIVER.
 * The "last active SUPER_ADMIN" rule needs the database and lives in UsersService.
 */
export function checkRoleChange(
  actor: { id: string; roles: readonly StaffRole[] },
  targetUserId: string,
  changedRoles: readonly StaffRole[],
): RoleChangeCheck {
  if (changedRoles.length === 0) return { ok: true };
  if (actor.id === targetUserId) return { ok: false, reason: 'You cannot change your own roles.' };
  if (actor.roles.includes(StaffRole.SUPER_ADMIN)) return { ok: true };
  if (actor.roles.includes(StaffRole.ADMIN)) {
    const notAllowed = changedRoles.filter((role) => !ADMIN_GRANTABLE.includes(role));
    return notAllowed.length === 0
      ? { ok: true }
      : { ok: false, reason: `Only a Super Admin can change: ${notAllowed.join(', ')}.` };
  }
  return { ok: false, reason: 'You are not allowed to change roles.' };
}
