/** Pricing feature ↔ API (Orval-generated hooks). Fix names here only if generation differs. */
import { useQueryClient } from '@tanstack/react-query';
import {
  usePricingCreate,
  usePricingList,
  usePricingPreview,
  usePricingUpdate,
  useVehiclesListCategories,
} from '@eul/api-client';

export const usePricingRules = () => usePricingList();

/** Vehicle classes, for the "add price" class select. */
export const useCategoriesForPricing = () => useVehiclesListCategories();

function useRefreshRules() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['/pricing/rules'] });
}

export function useUpdatePricingRule() {
  const refresh = useRefreshRules();
  return usePricingUpdate({ mutation: { onSuccess: refresh } });
}

export function useCreatePricingRule() {
  const refresh = useRefreshRules();
  return usePricingCreate({ mutation: { onSuccess: refresh } });
}

export function usePricePreview(ruleId: string, distanceMeters: number, durationSeconds: number, enabled: boolean) {
  return usePricingPreview(ruleId, { distanceMeters, durationSeconds }, { query: { enabled } });
}
