/** Status tabs on the bookings list. Each tab is a set of the fixed booking statuses. */
export const STATUS_TABS = [
  { key: 'all', statuses: [] },
  { key: 'attention', statuses: ['NEEDS_ATTENTION'] },
  { key: 'unassigned', statuses: ['NEW', 'PENDING_DISPATCH', 'DRIVERS_NOTIFIED'] },
  { key: 'assigned', statuses: ['ASSIGNED'] },
  { key: 'active', statuses: ['DRIVER_EN_ROUTE', 'ARRIVED', 'IN_JOURNEY'] },
  { key: 'completed', statuses: ['COMPLETED'] },
  { key: 'cancelled', statuses: ['CANCELLED'] },
] as const;

export type StatusTabKey = (typeof STATUS_TABS)[number]['key'];

export function isStatusTab(value: unknown): value is StatusTabKey {
  return STATUS_TABS.some((tab) => tab.key === value);
}

export function statusesFor(tab: StatusTabKey): string | undefined {
  const statuses = STATUS_TABS.find((t) => t.key === tab)?.statuses ?? [];
  return statuses.length ? statuses.join(',') : undefined;
}

/** Bookings a dispatcher may still assign (same list as the API). */
export const ASSIGNABLE = ['NEW', 'PENDING_DISPATCH', 'DRIVERS_NOTIFIED', 'NEEDS_ATTENTION'];
