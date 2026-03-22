import { describe, it, expect } from "vitest";
import { leboncoinParser } from "../../src/parsers/leboncoin.js";

describe("leboncoinParser", () => {
  it("should match leboncoin sender patterns", () => {
    expect(leboncoinParser.senderPatterns).toContain("@leboncoin.fr");
  });

  it("should return empty array for html without listings", () => {
    const result = leboncoinParser.parse("<html><body>No listings</body></html>");
    expect(result).toEqual([]);
  });
});
