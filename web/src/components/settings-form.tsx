"use client";

import { useActionState } from "react";
import { updateSettings } from "@/lib/actions/settings";
import { INITIAL_SETTINGS_FORM_STATE } from "@/lib/settings-form-state";

interface SettingsFormProps {
  notificationsEnabled: boolean;
  notifyTo: string | null;
  defaultNotifyTo: string | null;
}

const inputClass =
  "w-full rounded-md border border-border bg-surface-1 px-2.5 py-1.5 text-sm text-primary placeholder:text-muted focus:outline-2 focus:outline-accent";

export function SettingsForm({ notificationsEnabled, notifyTo, defaultNotifyTo }: SettingsFormProps) {
  const [state, formAction, pending] = useActionState(updateSettings, INITIAL_SETTINGS_FORM_STATE);
  const values = state.values ?? { notificationsEnabled, notifyTo: notifyTo ?? "" };

  return (
    // Keyed on the submitted values so the uncontrolled inputs follow the saved state after a submit
    <form key={JSON.stringify(values)} action={formAction} className="flex flex-col gap-5">
      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">Notifications</h2>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="notificationsEnabled"
            defaultChecked={values.notificationsEnabled}
            className="mt-0.5 size-4 accent-[var(--accent)]"
          />
          <span>
            <span className="font-medium">Envoyer les nouvelles annonces par mail</span>
            <span className="block text-secondary">
              Désactivé, le worker continue de relever et d&apos;enregistrer les annonces (visibles ici), mais
              n&apos;envoie aucun mail. Les annonces reçues pendant ce temps ne seront pas envoyées à la réactivation.
              Le bouton « Sauvegarder » des mails reste actif.
            </span>
          </span>
        </label>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">Destinataire</h2>
        <label className="flex max-w-md flex-col gap-1 text-xs font-medium text-secondary">
          Adresse qui reçoit les annonces
          <input
            type="email"
            name="notifyTo"
            defaultValue={values.notifyTo}
            placeholder={defaultNotifyTo ?? "vous@exemple.fr"}
            maxLength={254}
            className={inputClass}
          />
          {state.fieldErrors?.notifyTo && <span className="text-red-600">{state.fieldErrors.notifyTo}</span>}
          <span className="font-normal text-muted">
            {defaultNotifyTo
              ? `Vide : ${defaultNotifyTo} (NOTIFY_TO du .env).`
              : "Vide : NOTIFY_TO du .env, actuellement non défini."}
          </span>
        </label>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          Enregistrer
        </button>
        {state.message && (
          <p className={`text-sm ${state.status === "error" ? "text-red-600" : "text-secondary"}`}>{state.message}</p>
        )}
      </div>
    </form>
  );
}
