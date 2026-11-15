/**
 * The bookings feature's only contact with the API: thin wrappers around the
 * Orval-generated hooks (npm run api:generate). If generated names change, fix them here only.
 */
import { useQueryClient } from '@tanstack/react-query';
import {
  getBookingsDetailQueryKey,
  useBookingsAssign,
  useBookingsCandidates,
  useBookingsDetail,
  useBookingsList,
  type BookingsListParams,
} from '@eul/api-client';

// "Dispatchers see new bookings without refreshing": poll until the live socket (phase 1E).
const LIVE_REFRESH_MS = 15_000;

export function useBookingList(params: BookingsListParams) {
  return useBookingsList(params, {
    query: { refetchInterval: LIVE_REFRESH_MS, placeholderData: (previous) => previous },
  });
}

export function useBookingDetail(id: string) {
  return useBookingsDetail(id, { query: { refetchInterval: LIVE_REFRESH_MS } });
}

export function useDriverCandidates(bookingId: string, enabled: boolean) {
  return useBookingsCandidates(bookingId, { query: { enabled, staleTime: 0 } });
}

/** No optimistic update: we wait for the API (§5 Dashboard). */
export function useAssignDriver(bookingId: string) {
  const queryClient = useQueryClient();
  return useBookingsAssign({
    mutation: {
      onSettled: async () => {
        await queryClient.invalidateQueries({ queryKey: getBookingsDetailQueryKey(bookingId) });
        await queryClient.invalidateQueries({ queryKey: ['/bookings'] });
      },
    },
  });
}
