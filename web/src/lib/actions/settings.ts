"use server";

import { revalidatePath } from "next/cache";
import { getDb, getSettings, settings, SETTINGS_ID } from "@immofilter/db";
import type { SettingsFormState } from "@/lib/settings-form-state";
import { settingsInputSchema } from "@/lib/settings-schema";

export async function updateSettings(_previous: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const values = {
    notificationsEnabled: formData.get("notificationsEnabled") === "on",
    notifyTo: String(formData.get("notifyTo") ?? ""),
  };
  const result = settingsInputSchema.safeParse({
    notificationsEnabled: formData.get("notificationsEnabled"),
    notifyTo: formData.get("notifyTo"),
  });
  if (!result.success) {
    return { status: "error", values, fieldErrors: { notifyTo: result.error.flatten().fieldErrors.notifyTo?.[0] } };
  }

  try {
    const previous = await getSettings();
    const now = new Date();
    // Switching back on: listings received while disabled are never mailed
    const notificationsResumedAt =
      result.data.notificationsEnabled && !previous.notificationsEnabled ? now : previous.notificationsResumedAt;
    const row = { ...result.data, notificationsResumedAt, updatedAt: now };

    await getDb()
      .insert(settings)
      .values({ id: SETTINGS_ID, ...row })
      .onConflictDoUpdate({ target: settings.id, set: row });
  } catch (error) {
    console.error("[Settings] Error saving settings:", error);
    return { status: "error", values, message: "Impossible d'enregistrer la configuration" };
  }

  revalidatePath("/settings");
  return {
    status: "success",
    values: { notificationsEnabled: result.data.notificationsEnabled, notifyTo: result.data.notifyTo ?? "" },
    message: "Configuration enregistrée",
  };
}
