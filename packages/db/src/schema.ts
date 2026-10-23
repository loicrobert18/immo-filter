import { sql } from "drizzle-orm";
import { pgTable, text, integer, real, timestamp, varchar, serial, index, primaryKey, boolean, check } from "drizzle-orm/pg-core";

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

// A search is identified by the plus-address alias the platforms send alerts to (user+<tag>@domain)
export const searches = pgTable("searches", {
  id: serial("id").primaryKey(),
  tag: varchar("tag", { length: 32 }).notNull().unique(),
  label: text("label").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SearchRow = typeof searches.$inferSelect;

// Many-to-many: dedup is global, so one listing can arrive through several aliases
export const listingSearches = pgTable(
  "listing_searches",
  {
    listingId: integer("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    searchId: integer("search_id")
      .notNull()
      .references(() => searches.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.listingId, table.searchId] }),
    index("listing_searches_search_id_idx").on(table.searchId),
  ]
);

// Single row (id = 1) edited from the web /settings page and read by the worker
export const settings = pgTable(
  "settings",
  {
    id: integer("id").primaryKey().default(1),
    notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
    // Listings detected before this date are never mailed (set when notifications are switched back on)
    notificationsResumedAt: timestamp("notifications_resumed_at", { withTimezone: true }),
    // Overrides NOTIFY_TO when set
    notifyTo: text("notify_to"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check("settings_single_row", sql`${table.id} = 1`)]
);

export type SettingsRow = typeof settings.$inferSelect;
