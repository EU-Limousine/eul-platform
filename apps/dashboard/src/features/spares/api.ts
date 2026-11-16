/** Spare drivers feature ↔ API (Orval-generated). Fix names here only if generation differs. */
import { useQueryClient } from '@tanstack/react-query';
import {
  getSparesGetQueryKey,
  sparesGet,
  useDriversList,
  useSparesGet,
  useSparesSet,
} from '@eul/api-client';

export const useSpareDay = (date: string) => useSparesGet({ date });

export const useActiveDrivers = () => useDriversList({ isActive: true, pageSize: 100 });

/** Reads another date's list (for "copy from previous day"). */
export function useLoadSpareDay() {
  const queryClient = useQueryClient();
  return (date: string) =>
    queryClient.fetchQuery({ queryKey: getSparesGetQueryKey({ date }), queryFn: () => sparesGet({ date }) });
}

export function useSaveSpareDay() {
  const queryClient = useQueryClient();
  return useSparesSet({
    mutation: {
      onSuccess: (_data, variables) =>
        queryClient.invalidateQueries({ queryKey: getSparesGetQueryKey({ date: variables.data.date }) }),
    },
  });
}
