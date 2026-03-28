import { eq } from "drizzle-orm";
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

      await db.insert(listings).values({
        url: listing.url,
        price: listing.price,
        surface: listing.surface,
        rooms: listing.rooms,
        city: listing.city,
        address: listing.address,
        imageUrl: listing.imageUrl,
        platform: listing.platform,
        dedupHash: listing.dedupHash,
        detectedAt: listing.detectedAt,
      });

      newListings.push(listing);
    } catch (error) {
      console.error(`[Dedup] Error processing listing ${listing.url}:`, error);
    }
  }

  return newListings;
}
