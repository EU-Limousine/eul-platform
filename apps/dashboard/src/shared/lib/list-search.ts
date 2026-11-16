/** URL search for simple lists: ?q=…&page=… (both optional, so plain links work). */
export interface ListSearch {
  q?: string;
  page?: number;
}

export function validateListSearch(raw: Record<string, unknown>): ListSearch {
  const page = Number(raw.page);
  return {
    q: typeof raw.q === 'string' && raw.q.trim() ? raw.q.trim().slice(0, 100) : undefined,
    page: Number.isInteger(page) && page > 1 ? page : undefined,
  };
}
