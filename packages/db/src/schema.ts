import { pgTable, text, integer, real, timestamp, varchar, serial, index } from "drizzle-orm/pg-core";

export const listings = pgTable(
  "listings",
  {
    id: serial("id").primaryKey(),
    url: text("url").notNull().unique(),
    title: text("title"),
    price: integer("price"),
    surface: real("surface"),
    rooms: integer("rooms"),
    city: varchar("city", { length: 255 }),
    address: text("address"),
    imageUrl: text("image_url"),
    platform: varchar("platform", { length: 50 }).notNull(),
    dedupHash: varchar("dedup_hash", { length: 64 }).notNull(),
    detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
  },
  (table) => [
    index("listings_dedup_hash_idx").on(table.dedupHash),
    index("listings_detected_at_idx").on(table.detectedAt),
    index("listings_city_idx").on(table.city),
    index("listings_platform_idx").on(table.platform),
    index("listings_price_idx").on(table.price),
  ]
);

export type ListingRow = typeof listings.$inferSelect;
