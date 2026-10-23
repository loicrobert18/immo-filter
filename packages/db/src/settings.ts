import { eq } from "drizzle-orm";
import { getDb } from "./client.js";
import { settings } from "./schema.js";

export const SETTINGS_ID = 1;

export interface AppSettings {
  notificationsEnabled: boolean;
  notificationsResumedAt: Date | null;
  notifyTo: string | null;
}

export const DEFAULT_SETTINGS: AppSettings = {
  notificationsEnabled: true,
  notificationsResumedAt: null,
  notifyTo: null,
};

// The row is created on first save from the web, so a fresh database falls back to defaults
export async function getSettings(): Promise<AppSettings> {
  const [row] = await getDb()
    .select({
      notificationsEnabled: settings.notificationsEnabled,
      notificationsResumedAt: settings.notificationsResumedAt,
      notifyTo: settings.notifyTo,
    })
    .from(settings)
    .where(eq(settings.id, SETTINGS_ID))
    .limit(1);

  return row ?? DEFAULT_SETTINGS;
}

export function resolveNotifyTo(appSettings: AppSettings, fallback: string | undefined): string | null {
  return appSettings.notifyTo || fallback || null;
}
