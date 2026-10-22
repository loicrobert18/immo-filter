"use client";

import { usePathname, useRouter } from "next/navigation";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { PERIOD_OPTIONS, SORT_OPTIONS, platformLabel } from "@/lib/filter-options";
import type { ListingFilters as Filters } from "@/lib/filters";

interface ListingFiltersProps {
  filters: Filters;
  cities: string[];
  platforms: string[];
}

const inputClass =
  "w-full rounded-md border border-border bg-surface-1 px-2.5 py-1.5 text-sm text-primary placeholder:text-muted focus:outline-2 focus:outline-accent";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-secondary">
      {label}
      {children}
    </label>
  );
}

export function ListingFilters({ filters, cities, platforms }: ListingFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();

  function navigate(form: HTMLFormElement) {
    // Drop empty fields so the URL only carries active filters; page resets to 1
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(form)) {
      if (typeof value === "string" && value.trim() !== "") params.set(key, value.trim());
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate(event.currentTarget);
  }

  function handleSelectChange(event: ChangeEvent<HTMLSelectElement>) {
    if (event.currentTarget.form) navigate(event.currentTarget.form);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-surface-1 p-4 sm:grid-cols-4 lg:grid-cols-6"
    >
      <div className="col-span-2">
        <Field label="Recherche">
          <input name="q" defaultValue={filters.q} placeholder="Titre ou adresse" className={inputClass} />
        </Field>
      </div>
      <Field label="Ville">
        <select name="city" defaultValue={filters.city ?? ""} onChange={handleSelectChange} className={inputClass}>
          <option value="">Toutes</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Plateforme">
        <select
          name="platform"
          defaultValue={filters.platform ?? ""}
          onChange={handleSelectChange}
          className={inputClass}
        >
          <option value="">Toutes</option>
          {platforms.map((platform) => (
            <option key={platform} value={platform}>
              {platformLabel(platform)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Période">
        <select name="period" defaultValue={filters.period} onChange={handleSelectChange} className={inputClass}>
          {Object.entries(PERIOD_OPTIONS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Tri">
        <select name="sort" defaultValue={filters.sort} onChange={handleSelectChange} className={inputClass}>
          {Object.entries(SORT_OPTIONS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Prix min (€)">
        <input name="priceMin" type="number" min={0} step={1000} defaultValue={filters.priceMin} className={inputClass} />
      </Field>
      <Field label="Prix max (€)">
        <input name="priceMax" type="number" min={0} step={1000} defaultValue={filters.priceMax} className={inputClass} />
      </Field>
      <Field label="Surface min (m²)">
        <input name="surfaceMin" type="number" min={0} defaultValue={filters.surfaceMin} className={inputClass} />
      </Field>
      <Field label="Surface max (m²)">
        <input name="surfaceMax" type="number" min={0} defaultValue={filters.surfaceMax} className={inputClass} />
      </Field>
      <Field label="Pièces min">
        <input name="roomsMin" type="number" min={0} defaultValue={filters.roomsMin} className={inputClass} />
      </Field>
      <div className="flex items-end gap-2">
        <button
          type="submit"
          className="flex-1 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
        >
          Appliquer
        </button>
        <button
          type="button"
          onClick={() => router.push(pathname)}
          className="rounded-md border border-border px-3 py-1.5 text-sm text-secondary hover:text-primary"
        >
          Réinitialiser
        </button>
      </div>
    </form>
  );
}
