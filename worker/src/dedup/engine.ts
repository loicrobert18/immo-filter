import { eq, isNull } from "drizzle-orm";
import { db } from "../db/client.js";
import { listings } from "../db/schema.js";
import type { Listing } from "../types/listing.js";

export { computeDedupHash } from "./hash.js";

export async function filterNewListings(
  candidates: Listing[]
): Promise<Listing[]> {
  const newListings: Listing[] = [];

  for (const listing of candidates) {
    try {
      const existingByUrl = await db
        .select()
        .from(listings)
        .where(eq(listings.url, listing.url))
        .limit(1);

      if (existingByUrl.length > 0) {
        continue;
      }

      const existingByHash = await db
        .select()
        .from(listings)
        .where(eq(listings.dedupHash, listing.dedupHash))
        .limit(1);

      if (existingByHash.length > 0) {
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

      newListings.push({ ...listing, id: inserted?.id });
    } catch (error) {
      console.error(`[Dedup] Error processing listing ${listing.url}:`, error);
    }
  }

  return newListings;
}

export async function getUnnotifiedListings(): Promise<Listing[]> {
  const rows = await db
    .select()
    .from(listings)
    .where(isNull(listings.notifiedAt));

  return rows.map((row) => ({
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
  }));
}

export async function markAsNotified(ids: number[]): Promise<void> {
  if (ids.length === 0) return;

  for (const id of ids) {
    await db
      .update(listings)
      .set({ notifiedAt: new Date() })
      .where(eq(listings.id, id));
  }
}
