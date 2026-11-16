/** Vehicles feature ↔ API (Orval-generated hooks). Fix names here only if generation differs. */
import { useQueryClient } from '@tanstack/react-query';
import {
  useVehiclesCreateVehicle,
  useVehiclesListCategories,
  useVehiclesListVehicles,
  useVehiclesUpdateVehicle,
  type VehiclesListVehiclesParams,
} from '@eul/api-client';

export const useCategories = () => useVehiclesListCategories();

export const useVehicles = (params: VehiclesListVehiclesParams) =>
  useVehiclesListVehicles(params, { query: { placeholderData: (previous) => previous } });

function useRefreshFleet() {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: ['/vehicles'] });
    await queryClient.invalidateQueries({ queryKey: ['/vehicle-categories'] });
  };
}

export function useCreateVehicle() {
  const refresh = useRefreshFleet();
  return useVehiclesCreateVehicle({ mutation: { onSuccess: refresh } });
}

export function useUpdateVehicle() {
  const refresh = useRefreshFleet();
  return useVehiclesUpdateVehicle({ mutation: { onSuccess: refresh } });
}
