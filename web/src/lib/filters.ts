import { and, desc, eq, gte, ilike, lte, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { listingSearches, listings, searches } from "@immofilter/db";
import { PERIOD_OPTIONS, SORT_OPTIONS, UNCLASSIFIED_SEARCH, type PeriodOption, type SortOption } from "./filter-options";

export type SearchParams = Record<string, string | string[] | undefined>;

const PERIOD_DAYS: Record<Exclude<PeriodOption, "all">, number> = { "7d": 7, "30d": 30 };

function emptyToUndefined(value: unknown): unknown {
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}

function enumKeys<K extends string>(options: Record<K, string>): [K, ...K[]] {
  return Object.keys(options) as [K, ...K[]];
}

// Invalid values are silently dropped rather than failing the whole page
const optionalText = z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()).catch(undefined);
const optionalNumber = z
  .preprocess(emptyToUndefined, z.coerce.number().finite().nonnegative().optional())
  .catch(undefined);
const optionalInt = z
  .preprocess(emptyToUndefined, z.coerce.number().int().nonnegative().optional())
  .catch(undefined);

const filtersSchema = z.object({
  q: optionalText,
  city: optionalText,
  platform: optionalText,
  search: optionalText,
  priceMin: optionalNumber,
  priceMax: optionalNumber,
  surfaceMin: optionalNumber,
  surfaceMax: optionalNumber,
  roomsMin: optionalInt,
  period: z.enum(enumKeys(PERIOD_OPTIONS)).catch("all"),
  sort: z.enum(enumKeys(SORT_OPTIONS)).catch("recent"),
  page: z.coerce.number().int().min(1).catch(1),
});

export type ListingFilters = z.infer<typeof filtersSchema>;

export function parseListingFilters(params: SearchParams): ListingFilters {
  const flat = Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
  );
  return filtersSchema.parse(flat);
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export function buildWhere(filters: ListingFilters, now: Date = new Date()): SQL | undefined {
  const conditions: (SQL | undefined)[] = [];

  if (filters.q) {
    const pattern = `%${escapeLike(filters.q)}%`;
    conditions.push(or(ilike(listings.title, pattern), ilike(listings.address, pattern)));
  }
  if (filters.city) conditions.push(eq(listings.city, filters.city));
  if (filters.platform) conditions.push(eq(listings.platform, filters.platform));
  if (filters.search === UNCLASSIFIED_SEARCH) {
    conditions.push(
      sql`not exists (select 1 from ${listingSearches} where ${listingSearches.listingId} = ${listings.id})`
    );
  } else if (filters.search) {
    conditions.push(
      sql`exists (select 1 from ${listingSearches} inner join ${searches} on ${searches.id} = ${listingSearches.searchId} where ${listingSearches.listingId} = ${listings.id} and ${searches.tag} = ${filters.search})`
    );
  }
  if (filters.priceMin != null) conditions.push(gte(listings.price, filters.priceMin));
  if (filters.priceMax != null) conditions.push(lte(listings.price, filters.priceMax));
  if (filters.surfaceMin != null) conditions.push(gte(listings.surface, filters.surfaceMin));
  if (filters.surfaceMax != null) conditions.push(lte(listings.surface, filters.surfaceMax));
  if (filters.roomsMin != null) conditions.push(gte(listings.rooms, filters.roomsMin));
  if (filters.period !== "all") {
    const since = new Date(now.getTime() - PERIOD_DAYS[filters.period] * 24 * 60 * 60 * 1000);
    conditions.push(gte(listings.detectedAt, since));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

const pricePerM2 = sql`${listings.price}::float / nullif(${listings.surface}, 0)`;

export function buildOrderBy(sort: SortOption): SQL[] {
  const tieBreaker = desc(listings.id);
  switch (sort) {
    case "price-asc":
      return [sql`${listings.price} asc nulls last`, tieBreaker];
    case "price-desc":
      return [sql`${listings.price} desc nulls last`, tieBreaker];
    case "surface-desc":
      return [sql`${listings.surface} desc nulls last`, tieBreaker];
    case "price-per-m2-asc":
      return [sql`${pricePerM2} asc nulls last`, tieBreaker];
    case "recent":
      return [desc(listings.detectedAt), tieBreaker];
  }
}
