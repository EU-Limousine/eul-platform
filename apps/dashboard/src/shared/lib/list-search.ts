/** URL search for simple lists: ?q=…&page=…&new=true (all optional, so plain links work). */
export interface ListSearch {
  q?: string;
  page?: number;
  /** Open the "add" dialog on arrival (quick access, command menu). Removed once opened. */
  new?: boolean;
}

export function validateListSearch(raw: Record<string, unknown>): ListSearch {
  const page = Number(raw.page);
  return {
    q: typeof raw.q === 'string' && raw.q.trim() ? raw.q.trim().slice(0, 100) : undefined,
    page: Number.isInteger(page) && page > 1 ? page : undefined,
    new: raw.new === true || raw.new === 'true' || raw.new === 1 ? true : undefined,
  };
}
