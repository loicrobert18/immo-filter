import { pgTable, text, integer, real, timestamp, varchar } from "drizzle-orm/pg-core";

export const listings = pgTable("listings", {
  url: text("url").primaryKey(),
  price: integer("price"),
  surface: real("surface"),
  rooms: integer("rooms"),
  city: varchar("city", { length: 255 }),
  address: text("address"),
  platform: varchar("platform", { length: 50 }).notNull(),
  dedupHash: varchar("dedup_hash", { length: 64 }).notNull(),
  detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
});
