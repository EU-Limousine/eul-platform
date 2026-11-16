/** Pricing feature ↔ API (Orval-generated hooks). Fix names here only if generation differs. */
import { useQueryClient } from '@tanstack/react-query';
import { usePricingList, usePricingPreview, usePricingUpdate } from '@eul/api-client';

export const usePricingRules = () => usePricingList();

export function useUpdatePricingRule() {
  const queryClient = useQueryClient();
  return usePricingUpdate({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/pricing/rules'] }) } });
}

export function usePricePreview(ruleId: string, distanceMeters: number, durationSeconds: number, enabled: boolean) {
  return usePricingPreview(ruleId, { distanceMeters, durationSeconds }, { query: { enabled } });
}
