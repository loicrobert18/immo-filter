import { z } from "zod";

export const settingsInputSchema = z.object({
  // Unchecked checkboxes are absent from FormData
  notificationsEnabled: z.preprocess((value) => value === "on", z.boolean()),
  // Empty means "use NOTIFY_TO from .env"
  notifyTo: z.preprocess(
    (value) => (typeof value === "string" && value.trim() !== "" ? value.trim() : null),
    z.string().email("Adresse e-mail invalide").max(254).nullable()
  ),
});

export type SettingsInput = z.infer<typeof settingsInputSchema>;
