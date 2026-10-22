"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, searches } from "@immofilter/db";
import type { ZodError } from "zod";
import type { SearchFormState } from "@/lib/search-form-state";
import { searchInputSchema, type SearchInput } from "@/lib/search-schema";

const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(error: unknown): boolean {
  // postgres-js errors may be wrapped by drizzle, so look at the cause too
  for (let current = error; current instanceof Error; current = current.cause) {
    if ("code" in current && current.code === UNIQUE_VIOLATION) return true;
  }
  return false;
}

function parseForm(formData: FormData) {
  const values = { tag: String(formData.get("tag") ?? ""), label: String(formData.get("label") ?? "") };
  return { values, result: searchInputSchema.safeParse(values) };
}

function invalid(values: SearchFormState["values"], error: ZodError<SearchInput>): SearchFormState {
  const { fieldErrors } = error.flatten();
  return { status: "error", values, fieldErrors: { tag: fieldErrors.tag?.[0], label: fieldErrors.label?.[0] } };
}

function revalidateSearchPages(): void {
  revalidatePath("/searches");
  revalidatePath("/listings");
  revalidatePath("/stats");
}

export async function createSearch(_previous: SearchFormState, formData: FormData): Promise<SearchFormState> {
  const { values, result } = parseForm(formData);
  if (!result.success) return invalid(values, result.error);

  try {
    await getDb().insert(searches).values(result.data);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { status: "error", values, fieldErrors: { tag: "Ce tag est déjà utilisé" } };
    }
    console.error("[Searches] Error creating search:", error);
    return { status: "error", values, message: "Impossible de créer la recherche" };
  }

  revalidateSearchPages();
  return { status: "success", message: `Recherche « ${result.data.label} » créée` };
}

export async function updateSearch(_previous: SearchFormState, formData: FormData): Promise<SearchFormState> {
  const id = Number(formData.get("id"));
  const { values, result } = parseForm(formData);
  if (!Number.isInteger(id) || id <= 0) return { status: "error", values, message: "Recherche inconnue" };
  if (!result.success) return invalid(values, result.error);

  try {
    const updated = await getDb()
      .update(searches)
      .set(result.data)
      .where(eq(searches.id, id))
      .returning({ id: searches.id });
    if (updated.length === 0) return { status: "error", values, message: "Cette recherche n'existe plus" };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { status: "error", values, fieldErrors: { tag: "Ce tag est déjà utilisé" } };
    }
    console.error("[Searches] Error updating search:", error);
    return { status: "error", values, message: "Impossible de modifier la recherche" };
  }

  revalidateSearchPages();
  return { status: "success", values: result.data, message: "Modifications enregistrées" };
}

// Listings are kept: only their links to this search are removed (ON DELETE CASCADE)
export async function deleteSearch(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;

  try {
    await getDb().delete(searches).where(eq(searches.id, id));
  } catch (error) {
    console.error("[Searches] Error deleting search:", error);
    return;
  }

  revalidateSearchPages();
}
