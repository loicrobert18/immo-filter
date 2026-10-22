import { and, count, desc, eq, gt, isNotNull, sql } from "drizzle-orm";
import { getDb, listingSearches, listings, searches } from "@immofilter/db";

const TIME_ZONE = "Europe/Paris";

const pricePerM2 = sql`${listings.price}::float / nullif(${listings.surface}, 0)`;

export interface Kpis {
  total: number;
  last7Days: number;
  notified: number;
  medianPrice: number | null;
  medianPricePerM2: number | null;
}

export async function getKpis(): Promise<Kpis> {
  const [row] = await getDb()
    .select({
      total: count(),
      last7Days: sql<number>`count(*) filter (where ${listings.detectedAt} >= now() - interval '7 days')`.mapWith(
        Number
      ),
      notified: count(listings.notifiedAt),
      medianPrice: sql<number | null>`percentile_cont(0.5) within group (order by ${listings.price})`.mapWith(
        Number
      ),
      medianPricePerM2: sql<number | null>`percentile_cont(0.5) within group (order by ${pricePerM2})`.mapWith(
        Number
      ),
    })
    .from(listings);

  return row ?? { total: 0, last7Days: 0, notified: 0, medianPrice: null, medianPricePerM2: null };
}

export interface DailyCount {
  day: string;
  total: number;
  byPlatform: Record<string, number>;
}

function lastDays(days: number, now: Date): string[] {
  // Anchor on today's date in Paris, then step back in UTC to stay clear of DST shifts
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(now);
  const [year, month, day] = today.split("-").map(Number) as [number, number, number];
  const anchor = Date.UTC(year, month - 1, day);

  return Array.from({ length: days }, (_, index) =>
    new Date(anchor - (days - 1 - index) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
}

export async function getDailyCounts(days: number, now: Date = new Date()): Promise<DailyCount[]> {
  const dayExpr = sql<string>`to_char(${listings.detectedAt} at time zone ${sql.raw(`'${TIME_ZONE}'`)}, 'YYYY-MM-DD')`;

  const rows = await getDb()
    .select({ day: dayExpr, platform: listings.platform, count: count() })
    .from(listings)
    .where(sql`${listings.detectedAt} >= now() - make_interval(days => ${days})`)
    .groupBy(dayExpr, listings.platform);

  const byDay = new Map<string, DailyCount>(
    lastDays(days, now).map((day) => [day, { day, total: 0, byPlatform: {} }])
  );
  for (const row of rows) {
    const entry = byDay.get(row.day);
    if (!entry) continue;
    entry.byPlatform[row.platform] = row.count;
    entry.total += row.count;
  }

  return [...byDay.values()];
}

export interface PlatformCount {
  platform: string;
  count: number;
}

export async function getPlatformCounts(): Promise<PlatformCount[]> {
  return getDb()
    .select({ platform: listings.platform, count: count() })
    .from(listings)
    .groupBy(listings.platform)
    .orderBy(desc(count()));
}

export interface CityPrice {
  city: string;
  count: number;
  medianPricePerM2: number;
}

export async function getCityPrices(limit: number): Promise<CityPrice[]> {
  const rows = await getDb()
    .select({
      city: listings.city,
      count: count(),
      medianPricePerM2: sql<number>`percentile_cont(0.5) within group (order by ${pricePerM2})`.mapWith(Number),
    })
    .from(listings)
    .where(and(isNotNull(listings.city), isNotNull(listings.price), gt(listings.surface, 0)))
    .groupBy(listings.city)
    .orderBy(desc(count()))
    .limit(limit);

  return rows.flatMap((row) => (row.city ? [{ ...row, city: row.city }] : []));
}

export interface SearchCount {
  label: string;
  count: number;
}

export interface SearchCounts {
  bySearch: SearchCount[];
  unclassified: number;
}

export async function getSearchCounts(): Promise<SearchCounts> {
  const db = getDb();

  const [bySearch, unclassifiedRows] = await Promise.all([
    db
      .select({ label: searches.label, count: count(listingSearches.listingId) })
      .from(searches)
      .leftJoin(listingSearches, eq(listingSearches.searchId, searches.id))
      .groupBy(searches.id)
      .orderBy(desc(count(listingSearches.listingId))),
    db
      .select({ count: count() })
      .from(listings)
      .where(sql`not exists (select 1 from ${listingSearches} where ${listingSearches.listingId} = ${listings.id})`),
  ]);

  return { bySearch, unclassified: unclassifiedRows[0]?.count ?? 0 };
}
