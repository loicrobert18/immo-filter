import { asc, count, eq, max } from "drizzle-orm";
import { getDb, listingSearches, listings, searches } from "@immofilter/db";

export interface SearchSummary {
  id: number;
  tag: string;
  label: string;
  listingCount: number;
  lastDetectedAt: Date | null;
}

export async function listSearchesWithCounts(): Promise<SearchSummary[]> {
  return getDb()
    .select({
      id: searches.id,
      tag: searches.tag,
      label: searches.label,
      listingCount: count(listingSearches.listingId),
      lastDetectedAt: max(listings.detectedAt),
    })
    .from(searches)
    .leftJoin(listingSearches, eq(listingSearches.searchId, searches.id))
    .leftJoin(listings, eq(listings.id, listingSearches.listingId))
    .groupBy(searches.id)
    .orderBy(asc(searches.label));
}
