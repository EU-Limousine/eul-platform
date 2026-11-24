/** Enquiries feature ↔ API (Orval-generated hooks). Fix names here only if generation differs. */
import { useQueryClient } from '@tanstack/react-query';
import { useEnquiriesList, useEnquiriesUpdate, type EnquiriesListParams } from '@eul/api-client';

export const useEnquiries = (params: EnquiriesListParams) =>
  useEnquiriesList(params, { query: { placeholderData: (previous) => previous } });

/** No optimistic update: the list refreshes after the API answers. */
export function useUpdateEnquiry() {
  const queryClient = useQueryClient();
  return useEnquiriesUpdate({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/enquiries'] }) },
  });
}
