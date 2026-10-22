import * as cheerio from "cheerio";
import { createHash } from "node:crypto";
import type { BaseParser } from "./base.js";
import type { Listing } from "@immofilter/db";

function computeHash(city: string | null, surface: number | null, rooms: number | null, price: number | null): string {
  const key = [
    city?.toLowerCase().trim() ?? "",
    surface != null ? String(surface) : "",
    rooms != null ? String(rooms) : "",
    price != null ? String(Math.floor(price / 1000)) : "",
  ].join("|");
  return createHash("sha256").update(key).digest("hex");
}

export const bieniciParser: BaseParser = {
  platform: "bienici",
  senderPatterns: ["@bienici.com", "@bien-ici.com"],

  parse(html: string): Listing[] {
    const $ = cheerio.load(html);
    const results: Listing[] = [];

    $("a[href*='bienici.com/annonce'], a[href*='bien-ici.com/annonce']").each((_i, el) => {
      const url = $(el).attr("href");
      if (!url) return;

      const container = $(el).closest("tr, td, div");
      const text = container.text();
      const title = $(el).text().trim() || null;
      const price = text.match(/([\d\s]+)\s*€/)?.[1]?.replace(/\s/g, "");
      const surface = text.match(/([\d,]+)\s*m²/)?.[1]?.replace(",", ".");
      const rooms = text.match(/(\d+)\s*pièce/)?.[1];
      const city = text.match(/à\s+([A-ZÀ-Ü][a-zà-ü\s-]+)/)?.[1]?.trim() ?? null;

      const listing: Listing = {
        url: url.split("?")[0] ?? url,
        title,
        price: price ? Number(price) : null,
        surface: surface ? Number(surface) : null,
        rooms: rooms ? Number(rooms) : null,
        city,
        address: null,
        imageUrl: null,
        platform: "bienici",
        dedupHash: "",
        detectedAt: new Date(),
      };
      listing.dedupHash = computeHash(listing.city, listing.surface, listing.rooms, listing.price);
      results.push(listing);
    });

    return results;
  },
};
