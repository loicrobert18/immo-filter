import { describe, it, expect } from "vitest";
import { extractAlias } from "../src/imap/alias.js";

const BASE = "immo.alerts@gmail.com";

describe("extractAlias", () => {
  it("should read the tag from a plus-addressed To header", () => {
    expect(extractAlias(['"Immo" <immo.alerts+lyon@gmail.com>'], BASE)).toBe("lyon");
  });

  it("should read the tag from a Delivered-To header line", () => {
    expect(extractAlias(["Delivered-To: immo.alerts+annecy-t3@gmail.com"], BASE)).toBe("annecy-t3");
  });

  it("should be case-insensitive and return a lowercase tag", () => {
    expect(extractAlias(["Immo.Alerts+Lyon@Gmail.com"], BASE)).toBe("lyon");
  });

  it("should find the alias among several recipients", () => {
    expect(extractAlias(["someone@example.com, immo.alerts+paris@gmail.com"], BASE)).toBe("paris");
  });

  it("should return null when there is no alias", () => {
    expect(extractAlias(["immo.alerts@gmail.com"], BASE)).toBeNull();
    expect(extractAlias([], BASE)).toBeNull();
  });

  it("should ignore aliases of another address or domain", () => {
    expect(extractAlias(["other+lyon@gmail.com"], BASE)).toBeNull();
    expect(extractAlias(["immo.alerts+lyon@example.com"], BASE)).toBeNull();
  });

  it("should return null without a usable base address", () => {
    expect(extractAlias(["immo.alerts+lyon@gmail.com"], "")).toBeNull();
  });
});
