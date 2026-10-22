import { describe, it, expect } from "vitest";
import { UNCLASSIFIED_SEARCH } from "@/lib/filter-options";
import { aliasAddress, searchInputSchema } from "@/lib/search-schema";

describe("searchInputSchema", () => {
  it("accepts a slug tag and trims the label", () => {
    expect(searchInputSchema.parse({ tag: "lyon-t3", label: "  Appart Lyon  " })).toEqual({
      tag: "lyon-t3",
      label: "Appart Lyon",
    });
  });

  it("lowercases the tag", () => {
    expect(searchInputSchema.parse({ tag: " Annecy ", label: "Annecy" }).tag).toBe("annecy");
  });

  it.each(["", "-lyon", "lyon t3", "lyon+t3", "lyon_t3", "é", "a".repeat(33)])("rejects tag %j", (tag) => {
    expect(searchInputSchema.safeParse({ tag, label: "Lyon" }).success).toBe(false);
  });

  it("rejects the unclassified filter sentinel", () => {
    expect(searchInputSchema.safeParse({ tag: UNCLASSIFIED_SEARCH, label: "x" }).success).toBe(false);
  });

  it("rejects an empty or too long label", () => {
    expect(searchInputSchema.safeParse({ tag: "lyon", label: "   " }).success).toBe(false);
    expect(searchInputSchema.safeParse({ tag: "lyon", label: "a".repeat(101) }).success).toBe(false);
  });
});

describe("aliasAddress", () => {
  it("inserts the tag before the domain", () => {
    expect(aliasAddress("immo.alerts@gmail.com", "lyon")).toBe("immo.alerts+lyon@gmail.com");
  });

  it("returns null without a valid base address", () => {
    expect(aliasAddress("", "lyon")).toBeNull();
    expect(aliasAddress("@gmail.com", "lyon")).toBeNull();
  });
});
