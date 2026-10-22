import { describe, it, expect } from "vitest";
import { buildBatches, formatBatchSubject, formatSearchBadges, groupBySearch } from "../src/notify/mailer.js";
import type { Listing, SearchTag } from "@immofilter/db";

const LYON: SearchTag = { tag: "lyon", label: "Lyon" };
const ANNECY: SearchTag = { tag: "annecy", label: "Annecy" };

function makeListing(id: number, searches: SearchTag[] = []): Listing {
  return {
    id,
    url: `https://example.com/listing/${id}`,
    title: null,
    price: 300000,
    surface: 65,
    rooms: 3,
    city: "Lyon",
    address: null,
    imageUrl: null,
    platform: "seloger",
    dedupHash: "",
    detectedAt: new Date(),
    searches,
  };
}

describe("groupBySearch", () => {
  it("should group by first search, sorted by label, unclassified last", () => {
    const groups = groupBySearch([
      makeListing(1),
      makeListing(2, [LYON]),
      makeListing(3, [ANNECY]),
      makeListing(4, [LYON, ANNECY]),
    ]);

    expect(groups.map((g) => g.search?.tag ?? null)).toEqual(["annecy", "lyon", null]);
    expect(groups.map((g) => g.listings.map((l) => l.id))).toEqual([[3], [2, 4], [1]]);
  });

  it("should treat listings without searches field as unclassified", () => {
    const listing = makeListing(1);
    delete listing.searches;
    expect(groupBySearch([listing])).toEqual([{ search: null, listings: [listing] }]);
  });
});

describe("buildBatches", () => {
  it("should split each group into batches numbered within the group", () => {
    const items = [
      ...Array.from({ length: 7 }, (_, i) => makeListing(i + 1, [LYON])),
      makeListing(100, [ANNECY]),
    ];
    const batches = buildBatches(items, 5);

    expect(batches.map((b) => [b.search?.tag, b.listings.length, b.index, b.total])).toEqual([
      ["annecy", 1, 1, 1],
      ["lyon", 5, 1, 2],
      ["lyon", 2, 2, 2],
    ]);
  });
});

describe("formatBatchSubject", () => {
  it("should include the search label and batch position", () => {
    expect(formatBatchSubject({ search: LYON, listings: [makeListing(1), makeListing(2)], index: 1, total: 2 })).toBe(
      "ImmoFilter [Lyon] : 2 nouvelle(s) annonce(s) (1/2)"
    );
  });

  it("should omit the label for unclassified listings", () => {
    expect(formatBatchSubject({ search: null, listings: [makeListing(1)], index: 1, total: 1 })).toBe(
      "ImmoFilter : 1 nouvelle(s) annonce(s)"
    );
  });
});

describe("formatSearchBadges", () => {
  it("should escape labels", () => {
    expect(formatSearchBadges([{ tag: "x", label: "<b>T3</b>" }])).toContain("&#60;b&#62;T3&#60;/b&#62;");
  });

  it("should render nothing without searches", () => {
    expect(formatSearchBadges([])).toBe("");
  });
});
