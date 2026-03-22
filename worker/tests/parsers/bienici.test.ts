import { describe, it, expect } from "vitest";
import { bieniciParser } from "../../src/parsers/bienici.js";

describe("bieniciParser", () => {
  it("should match bienici sender patterns", () => {
    expect(bieniciParser.senderPatterns).toContain("@bienici.com");
  });

  it("should return empty array for html without listings", () => {
    const result = bieniciParser.parse("<html><body>No listings</body></html>");
    expect(result).toEqual([]);
  });
});
