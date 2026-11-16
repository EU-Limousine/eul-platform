/** Drivers feature ↔ API (Orval-generated hooks). Fix names here only if generation differs. */
import { useQueryClient } from '@tanstack/react-query';
import {
  useDriversCreate,
  useDriversList,
  useDriversUpdate,
  useVehiclesListVehicles,
  type DriversListParams,
} from '@eul/api-client';

export const useDrivers = (params: DriversListParams) =>
  useDriversList(params, { query: { placeholderData: (previous) => previous } });

/** Active vehicles for the "default vehicle" select (first 100 is plenty for one city). */
export const useActiveVehicles = () => useVehiclesListVehicles({ isActive: true, pageSize: 100 });

function useRefreshDrivers() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['/drivers'] });
}

export function useCreateDriver() {
  const refresh = useRefreshDrivers();
  return useDriversCreate({ mutation: { onSuccess: refresh } });
}

export function useUpdateDriver() {
  const refresh = useRefreshDrivers();
  return useDriversUpdate({ mutation: { onSuccess: refresh } });
}
