import { getSettings } from "@immofilter/db";
import { SettingsForm } from "@/components/settings-form";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();
  const defaultNotifyTo = process.env["NOTIFY_TO"] || null;

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <div>
        <h1 className="text-lg font-semibold">Configuration</h1>
        <p className="text-sm text-secondary">
          {settings.notificationsEnabled
            ? `Envoi des annonces actif${
                settings.notificationsResumedAt ? ` depuis le ${formatDateTime(settings.notificationsResumedAt)}` : ""
              }.`
            : "Envoi des annonces désactivé."}{" "}
          Les changements s&apos;appliquent au prochain passage du worker.
        </p>
      </div>
      <div className="rounded-lg border border-border bg-surface-1 p-4">
        <SettingsForm
          notificationsEnabled={settings.notificationsEnabled}
          notifyTo={settings.notifyTo}
          defaultNotifyTo={defaultNotifyTo}
        />
      </div>
    </div>
  );
}
