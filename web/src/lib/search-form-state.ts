// Kept apart from search-schema.ts so the client form doesn't bundle Zod
export interface SearchFormState {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<"tag" | "label", string>>;
  values?: { tag: string; label: string };
}

export const INITIAL_SEARCH_FORM_STATE: SearchFormState = { status: "idle" };
