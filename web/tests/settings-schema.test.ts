import { describe, it, expect } from "vitest";
import { settingsInputSchema } from "@/lib/settings-schema";

describe("settingsInputSchema", () => {
  it("reads a checked checkbox and trims the recipient", () => {
    expect(settingsInputSchema.parse({ notificationsEnabled: "on", notifyTo: "  me@example.com " })).toEqual({
      notificationsEnabled: true,
      notifyTo: "me@example.com",
    });
  });

  it("treats a missing checkbox as disabled and an empty recipient as null", () => {
    expect(settingsInputSchema.parse({ notificationsEnabled: null, notifyTo: "  " })).toEqual({
      notificationsEnabled: false,
      notifyTo: null,
    });
  });

  it("rejects an invalid recipient", () => {
    expect(settingsInputSchema.safeParse({ notificationsEnabled: "on", notifyTo: "pas-un-mail" }).success).toBe(false);
  });
});
