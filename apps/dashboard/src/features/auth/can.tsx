import type { ReactNode } from 'react';
import { useAuthStore } from './auth-store';

/** Check permissions, never role names. The API enforces them again — this only hides UI. */
export function useCan(permission?: string): boolean {
  const permissions = useAuthStore((s) => s.user?.permissions);
  if (!permission) return true;
  return permissions?.includes(permission) ?? false;
}

export function Can({ permission, children }: { permission: string; children: ReactNode }) {
  return useCan(permission) ? <>{children}</> : null;
}
