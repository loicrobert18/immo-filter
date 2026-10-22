import { describe, it, expect } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { buildOrderBy, buildWhere, parseListingFilters, type ListingFilters } from "@/lib/filters";

const dialect = new PgDialect();

function defaults(overrides: Partial<ListingFilters> = {}): ListingFilters {
  return { ...parseListingFilters({}), ...overrides };
}

describe("parseListingFilters", () => {
  it("returns defaults for empty params", () => {
    expect(parseListingFilters({})).toEqual({
      q: undefined,
      city: undefined,
      platform: undefined,
      priceMin: undefined,
      priceMax: undefined,
      surfaceMin: undefined,
      surfaceMax: undefined,
      roomsMin: undefined,
      period: "all",
      sort: "recent",
      page: 1,
    });
  });

  it("coerces valid numeric values", () => {
    const filters = parseListingFilters({ priceMin: "150000", surfaceMax: "72.5", roomsMin: "3", page: "4" });
    expect(filters).toMatchObject({ priceMin: 150000, surfaceMax: 72.5, roomsMin: 3, page: 4 });
  });

  it("ignores invalid or empty values instead of throwing", () => {
    const filters = parseListingFilters({
      priceMin: "abc",
      priceMax: "-5",
      roomsMin: "2.5",
      surfaceMin: "",
      period: "1y",
      sort: "random",
      page: "0",
    });
    expect(filters).toMatchObject({
      priceMin: undefined,
      priceMax: undefined,
      roomsMin: undefined,
      surfaceMin: undefined,
      period: "all",
      sort: "recent",
      page: 1,
    });
  });

  it("keeps the first value of repeated params and trims text", () => {
    const filters = parseListingFilters({ city: ["Lyon", "Paris"], q: "  balcon  " });
    expect(filters.city).toBe("Lyon");
    expect(filters.q).toBe("balcon");
  });
});

describe("buildWhere", () => {
  it("returns undefined when no filter is active", () => {
    expect(buildWhere(defaults())).toBeUndefined();
  });

  it("combines active filters with parameters", () => {
    const where = buildWhere(defaults({ city: "Lyon", priceMin: 100000, priceMax: 300000, roomsMin: 2 }));
    const query = dialect.sqlToQuery(where!);
    expect(query.sql).toContain('"listings"."city" = $1');
    expect(query.sql).toContain('"listings"."price" >= $2');
    expect(query.sql).toContain('"listings"."price" <= $3');
    expect(query.sql).toContain('"listings"."rooms" >= $4');
    expect(query.params).toEqual(["Lyon", 100000, 300000, 2]);
  });

  it("escapes LIKE wildcards in text search", () => {
    const query = dialect.sqlToQuery(buildWhere(defaults({ q: "100%_sud" }))!);
    expect(query.sql).toContain("ilike");
    expect(query.params).toEqual(["%100\\%\\_sud%", "%100\\%\\_sud%"]);
  });

  it("filters by period relative to now", () => {
    const now = new Date("2026-10-21T12:00:00Z");
    const query = dialect.sqlToQuery(buildWhere(defaults({ period: "7d" }), now)!);
    expect(query.sql).toContain('"listings"."detected_at" >= $1');
    expect(query.params).toEqual([new Date("2026-10-14T12:00:00Z").toISOString()]);
  });
});

describe("buildOrderBy", () => {
  it("puts nulls last for price sorts", () => {
    const [primary] = buildOrderBy("price-asc");
    expect(dialect.sqlToQuery(primary!).sql).toBe('"listings"."price" asc nulls last');
  });
});
