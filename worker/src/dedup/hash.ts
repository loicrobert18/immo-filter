import { createHash } from "node:crypto";
import type { Listing } from "@immofilter/db";

export function computeDedupHash(listing: Listing): string {
  const key = [
    listing.city?.toLowerCase().trim() ?? "",
    listing.surface != null ? String(listing.surface) : "",
    listing.rooms != null ? String(listing.rooms) : "",
    listing.price != null ? String(Math.floor(listing.price / 1000)) : "",
  ].join("|");

  return createHash("sha256").update(key).digest("hex");
}
