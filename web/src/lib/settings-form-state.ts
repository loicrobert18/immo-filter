// Kept apart from settings-schema.ts so the client form doesn't bundle Zod
export interface SettingsFormState {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<"notifyTo", string>>;
  values?: { notificationsEnabled: boolean; notifyTo: string };
}

export const INITIAL_SETTINGS_FORM_STATE: SettingsFormState = { status: "idle" };
