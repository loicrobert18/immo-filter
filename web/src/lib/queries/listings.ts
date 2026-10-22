import { asc, count, eq, inArray, isNotNull } from "drizzle-orm";
import { getDb, listingSearches, listings, searches, type ListingRow, type SearchTag } from "@immofilter/db";
import { buildOrderBy, buildWhere, type ListingFilters } from "@/lib/filters";

export const PAGE_SIZE = 24;

export type ListingWithSearches = ListingRow & { searches: SearchTag[] };

export interface ListingSearchResult {
  items: ListingWithSearches[];
  total: number;
  pageCount: number;
}

async function getSearchTags(listingIds: number[]): Promise<Map<number, SearchTag[]>> {
  const byListing = new Map<number, SearchTag[]>();
  if (listingIds.length === 0) return byListing;

  const rows = await getDb()
    .select({ listingId: listingSearches.listingId, tag: searches.tag, label: searches.label })
    .from(listingSearches)
    .innerJoin(searches, eq(searches.id, listingSearches.searchId))
    .where(inArray(listingSearches.listingId, listingIds))
    .orderBy(asc(searches.label));

  for (const { listingId, tag, label } of rows) {
    byListing.set(listingId, [...(byListing.get(listingId) ?? []), { tag, label }]);
  }
  return byListing;
}

export async function searchListings(filters: ListingFilters): Promise<ListingSearchResult> {
  const db = getDb();
  const where = buildWhere(filters);

  const [rows, totals] = await Promise.all([
    db
      .select()
      .from(listings)
      .where(where)
      .orderBy(...buildOrderBy(filters.sort))
      .limit(PAGE_SIZE)
      .offset((filters.page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(listings).where(where),
  ]);

  const tags = await getSearchTags(rows.map((row) => row.id));
  const items = rows.map((row) => ({ ...row, searches: tags.get(row.id) ?? [] }));

  const total = totals[0]?.total ?? 0;
  return { items, total, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export interface FilterChoices {
  cities: string[];
  platforms: string[];
  searches: SearchTag[];
}

export async function getFilterChoices(): Promise<FilterChoices> {
  const db = getDb();

  const [cityRows, platformRows, searchRows] = await Promise.all([
    db
      .selectDistinct({ city: listings.city })
      .from(listings)
      .where(isNotNull(listings.city))
      .orderBy(asc(listings.city)),
    db.selectDistinct({ platform: listings.platform }).from(listings).orderBy(asc(listings.platform)),
    db.select({ tag: searches.tag, label: searches.label }).from(searches).orderBy(asc(searches.label)),
  ]);

  return {
    cities: cityRows.flatMap((row) => (row.city ? [row.city] : [])),
    platforms: platformRows.map((row) => row.platform),
    searches: searchRows,
  };
}
