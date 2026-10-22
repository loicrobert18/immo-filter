import { eq, isNull, sql } from "drizzle-orm";
import { getDb, listings, listingSearches, searches, type Listing, type SearchTag } from "@immofilter/db";

export { computeDedupHash } from "./hash.js";

async function linkToSearch(listingId: number, searchId: number | null | undefined): Promise<void> {
  if (searchId == null) return;
  await getDb().insert(listingSearches).values({ listingId, searchId }).onConflictDoNothing();
}

export async function filterNewListings(
  candidates: Listing[]
): Promise<Listing[]> {
  const db = getDb();
  const newListings: Listing[] = [];

  for (const listing of candidates) {
    try {
      const existingByUrl = await db
        .select({ id: listings.id })
        .from(listings)
        .where(eq(listings.url, listing.url))
        .limit(1);

      const existing = existingByUrl.length > 0
        ? existingByUrl
        : await db
          .select({ id: listings.id })
          .from(listings)
          .where(eq(listings.dedupHash, listing.dedupHash))
          .limit(1);

      const match = existing[0];
      if (match) {
        // Duplicate: not notified again, but it gains the tag of the search it came through
        await linkToSearch(match.id, listing.searchId);
        continue;
      }

      const [inserted] = await db.insert(listings).values({
        url: listing.url,
        title: listing.title,
        price: listing.price,
        surface: listing.surface,
        rooms: listing.rooms,
        city: listing.city,
        address: listing.address,
        imageUrl: listing.imageUrl,
        platform: listing.platform,
        dedupHash: listing.dedupHash,
        detectedAt: listing.detectedAt,
      }).returning({ id: listings.id });

      if (inserted) await linkToSearch(inserted.id, listing.searchId);
      newListings.push({ ...listing, id: inserted?.id });
    } catch (error) {
      console.error(`[Dedup] Error processing listing ${listing.url}:`, error);
    }
  }

  return newListings;
}

// Includes the searches each listing is linked to, so the mailer can group and tag them
export async function getUnnotifiedListings(): Promise<Listing[]> {
  const rows = await getDb()
    .select({
      listing: listings,
      searches: sql<SearchTag[]>`coalesce(
        json_agg(json_build_object('tag', ${searches.tag}, 'label', ${searches.label}) order by ${searches.id})
          filter (where ${searches.id} is not null),
        '[]'
      )`,
    })
    .from(listings)
    .leftJoin(listingSearches, eq(listingSearches.listingId, listings.id))
    .leftJoin(searches, eq(searches.id, listingSearches.searchId))
    .where(isNull(listings.notifiedAt))
    .groupBy(listings.id)
    .orderBy(listings.id);

  return rows.map(({ listing: row, searches: tags }) => ({
    id: row.id,
    url: row.url,
    title: row.title,
    price: row.price,
    surface: row.surface,
    rooms: row.rooms,
    city: row.city,
    address: row.address,
    imageUrl: row.imageUrl,
    platform: row.platform,
    dedupHash: row.dedupHash,
    detectedAt: row.detectedAt,
    searches: tags,
  }));
}

export async function markAsNotified(ids: number[]): Promise<void> {
  if (ids.length === 0) return;

  const db = getDb();
  for (const id of ids) {
    await db
      .update(listings)
      .set({ notifiedAt: new Date() })
      .where(eq(listings.id, id));
  }
}
