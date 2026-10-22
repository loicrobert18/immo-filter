"use client";

import { useActionState } from "react";
import { createSearch, updateSearch } from "@/lib/actions/searches";
import { INITIAL_SEARCH_FORM_STATE } from "@/lib/search-form-state";

interface SearchFormProps {
  // Edit mode when set, create mode otherwise
  search?: { id: number; tag: string; label: string };
}

const inputClass =
  "w-full rounded-md border border-border bg-surface-1 px-2.5 py-1.5 text-sm text-primary placeholder:text-muted focus:outline-2 focus:outline-accent";

export function SearchForm({ search }: SearchFormProps) {
  const [state, formAction, pending] = useActionState(search ? updateSearch : createSearch, INITIAL_SEARCH_FORM_STATE);
  const values = state.values ?? search;

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {search && <input type="hidden" name="id" value={search.id} />}
      <div className="grid gap-3 sm:grid-cols-[1fr_14rem_auto] sm:items-start">
        <label className="flex flex-col gap-1 text-xs font-medium text-secondary">
          Nom
          <input
            name="label"
            defaultValue={values?.label}
            placeholder="Appart Lyon T3"
            required
            maxLength={100}
            className={inputClass}
          />
          {state.fieldErrors?.label && <span className="text-red-600">{state.fieldErrors.label}</span>}
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-secondary">
          Tag (alias mail)
          <input
            name="tag"
            defaultValue={values?.tag}
            placeholder="lyon"
            required
            maxLength={32}
            pattern="[a-zA-Z0-9][a-zA-Z0-9\-]*"
            title="Lettres, chiffres et tirets uniquement"
            className={`${inputClass} font-mono`}
          />
          {state.fieldErrors?.tag && <span className="text-red-600">{state.fieldErrors.tag}</span>}
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60 sm:mt-5"
        >
          {search ? "Enregistrer" : "Ajouter"}
        </button>
      </div>
      {search && (
        <p className="text-xs text-muted">
          Changer le tag change l&apos;adresse d&apos;alerte : les alertes créées avec l&apos;ancienne adresse
          arriveront en « Non classé ».
        </p>
      )}
      {state.message && (
        <p className={`text-sm ${state.status === "error" ? "text-red-600" : "text-secondary"}`}>{state.message}</p>
      )}
    </form>
  );
}
