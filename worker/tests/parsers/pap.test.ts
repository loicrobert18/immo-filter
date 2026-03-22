import { describe, it, expect } from "vitest";
import { papParser } from "../../src/parsers/pap.js";

describe("papParser", () => {
  it("should match pap sender patterns", () => {
    expect(papParser.senderPatterns).toContain("@pap.fr");
  });

  it("should return empty array for html without listings", () => {
    const result = papParser.parse("<html><body>No listings</body></html>");
    expect(result).toEqual([]);
  });
});
