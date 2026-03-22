import * as cheerio from "cheerio";
import { createHash } from "node:crypto";
import type { BaseParser } from "./base.js";
import type { Listing } from "../types/listing.js";

function computeHash(city: string | null, surface: number | null, rooms: number | null, price: number | null): string {
  const key = [
    city?.toLowerCase().trim() ?? "",
    surface != null ? String(surface) : "",
    rooms != null ? String(rooms) : "",
    price != null ? String(Math.floor(price / 1000)) : "",
  ].join("|");
  return createHash("sha256").update(key).digest("hex");
}

export const leboncoinParser: BaseParser = {
  platform: "leboncoin",
  senderPatterns: ["@leboncoin.fr", "@notifications.leboncoin.fr"],

  parse(html: string): Listing[] {
    const $ = cheerio.load(html);
    const results: Listing[] = [];

    $("a[href*='leboncoin.fr/ad/']").each((_i, el) => {
      const url = $(el).attr("href");
      if (!url) return;

      const text = $(el).closest("tr, td, div").text();
      const price = text.match(/([\d\s]+)\s*€/)?.[1]?.replace(/\s/g, "");
      const surface = text.match(/([\d,]+)\s*m²/)?.[1]?.replace(",", ".");
      const rooms = text.match(/(\d+)\s*pièce/)?.[1];
      const city = text.match(/à\s+([A-ZÀ-Ü][a-zà-ü\s-]+)/)?.[1]?.trim() ?? null;

      const listing: Listing = {
        url: url.split("?")[0] ?? url,
        price: price ? Number(price) : null,
        surface: surface ? Number(surface) : null,
        rooms: rooms ? Number(rooms) : null,
        city,
        address: null,
        platform: "leboncoin",
        dedupHash: "",
        detectedAt: new Date(),
      };
      listing.dedupHash = computeHash(listing.city, listing.surface, listing.rooms, listing.price);
      results.push(listing);
    });

    return results;
  },
};
