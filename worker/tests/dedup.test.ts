import { describe, it, expect } from "vitest";
import { computeDedupHash } from "../src/dedup/hash.js";
import type { Listing } from "@immofilter/db";

function makeListing(overrides: Partial<Listing> = {}): Listing {
  return {
    url: "https://example.com/listing/1",
    price: 300000,
    surface: 65,
    rooms: 3,
    city: "Paris",
    address: null,
    imageUrl: null,
    platform: "seloger",
    dedupHash: "",
    detectedAt: new Date(),
    ...overrides,
  };
}

describe("computeDedupHash", () => {
  it("should produce the same hash for identical listings", () => {
    const a = makeListing();
    const b = makeListing();
    expect(computeDedupHash(a)).toBe(computeDedupHash(b));
  });

  it("should produce the same hash for prices within 999€", () => {
    const a = makeListing({ price: 300000 });
    const b = makeListing({ price: 300999 });
    expect(computeDedupHash(a)).toBe(computeDedupHash(b));
  });

  it("should produce different hashes for prices differing by 1000€+", () => {
    const a = makeListing({ price: 300000 });
    const b = makeListing({ price: 301000 });
    expect(computeDedupHash(a)).not.toBe(computeDedupHash(b));
  });

  it("should produce different hashes for different cities", () => {
    const a = makeListing({ city: "Paris" });
    const b = makeListing({ city: "Lyon" });
    expect(computeDedupHash(a)).not.toBe(computeDedupHash(b));
  });
});
