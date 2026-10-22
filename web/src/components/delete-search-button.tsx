"use client";

import type { FormEvent } from "react";
import { deleteSearch } from "@/lib/actions/searches";

export function DeleteSearchButton({ id, label }: { id: number; label: string }) {
  function confirmDelete(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm(`Supprimer la recherche « ${label} » ? Ses annonces sont conservées.`)) {
      event.preventDefault();
    }
  }

  return (
    <form action={deleteSearch} onSubmit={confirmDelete}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="text-sm text-red-600 hover:underline">
        Supprimer
      </button>
    </form>
  );
}
