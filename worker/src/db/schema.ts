import { pgTable, text, integer, real, timestamp, varchar, serial } from "drizzle-orm/pg-core";

export const listings = pgTable("listings", {
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
});
