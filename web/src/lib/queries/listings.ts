import { asc, count, isNotNull } from "drizzle-orm";
import { getDb, listings, type ListingRow } from "@immofilter/db";
import { buildOrderBy, buildWhere, type ListingFilters } from "@/lib/filters";

export const PAGE_SIZE = 24;

export interface ListingSearchResult {
  items: ListingRow[];
  total: number;
  pageCount: number;
}

export async function searchListings(filters: ListingFilters): Promise<ListingSearchResult> {
  const db = getDb();
  const where = buildWhere(filters);

  const [items, totals] = await Promise.all([
    db
      .select()
      .from(listings)
      .where(where)
      .orderBy(...buildOrderBy(filters.sort))
      .limit(PAGE_SIZE)
      .offset((filters.page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(listings).where(where),
  ]);

  const total = totals[0]?.total ?? 0;
  return { items, total, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export interface FilterChoices {
  cities: string[];
  platforms: string[];
}

export async function getFilterChoices(): Promise<FilterChoices> {
  const db = getDb();

  const [cityRows, platformRows] = await Promise.all([
    db
      .selectDistinct({ city: listings.city })
      .from(listings)
      .where(isNotNull(listings.city))
      .orderBy(asc(listings.city)),
    db.selectDistinct({ platform: listings.platform }).from(listings).orderBy(asc(listings.platform)),
  ]);

  return {
    cities: cityRows.flatMap((row) => (row.city ? [row.city] : [])),
    platforms: platformRows.map((row) => row.platform),
  };
}
