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

export const selogerParser: BaseParser = {
  platform: "seloger",
  senderPatterns: ["@alertes.seloger.com", "@seloger.com", "@notifications.seloger.com"],

  parse(html: string): Listing[] {
    const $ = cheerio.load(html);
    const results: Listing[] = [];

    // Each listing has a "Voir l'annonce" link inside a container table
    $("a").filter((_i, el) => $(el).text().trim() === "Voir l'annonce").each((_i, el) => {
      const url = $(el).attr("href");
      if (!url) return;

      // Walk up to the containing table block with all listing info
      const container = $(el).closest("table").parent().closest("table").parent().closest("table");
      const text = container.text();

      // Price: "124 057 €" (in <strong>)
      const priceMatch = text.match(/([\d\s]+)\s*€/);
      const price = priceMatch?.[1]?.replace(/\s/g, "");

      // Rooms + surface: "2 pièces · 29 m²" or "2 pièces · 36,17 m²"
      const roomsMatch = text.match(/(\d+)\s*pièces?\s*·\s*([\d,]+)\s*m²/);
      const rooms = roomsMatch?.[1];
      const surface = roomsMatch?.[2]?.replace(",", ".");

      // City: "Grézieu-la-Varenne (69290)" or "Lyon 8ème arrondissement (69008)"
      const cityMatch = text.match(/([A-ZÀ-Üa-zà-ü][\w\sà-üÀ-Ü'-]+)\s*\(\d{5}\)/);
      const city = cityMatch?.[1]?.trim() ?? null;

      // Title: look for a bold/strong text in the container that describes the listing
      const titleEl = container.find("strong, b").filter((_j, strong) => {
        const t = $(strong).text().trim();
        return t.length > 10 && !t.match(/^\d/) && !t.includes("€");
      }).first();
      const title = titleEl.length > 0 ? titleEl.text().trim() : null;

      // Image: real photo is a background-image on a <td> (mms.seloger.com URL)
      let imageUrl: string | null = null;
      container.find("td[style*='background-image']").each((_j, td) => {
        if (imageUrl) return;
        const style = $(td).attr("style") || "";
        const bgMatch = style.match(/url\(['"]?(https?:\/\/[^'")\s]+)['"]?\)/);
        if (bgMatch?.[1]) {
          imageUrl = bgMatch[1];
        }
      });

      const listing: Listing = {
        url,
        title,
        price: price ? Number(price) : null,
        surface: surface ? Number(surface) : null,
        rooms: rooms ? Number(rooms) : null,
        city,
        address: null,
        imageUrl,
        platform: "seloger",
        dedupHash: "",
        detectedAt: new Date(),
      };
      listing.dedupHash = computeHash(listing.city, listing.surface, listing.rooms, listing.price);
      results.push(listing);
    });

    return results;
  },
};
