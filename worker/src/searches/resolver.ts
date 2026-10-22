import { getDb, searches } from "@immofilter/db";

export async function loadSearchIndex(): Promise<Map<string, number>> {
  const rows = await getDb().select({ id: searches.id, tag: searches.tag }).from(searches);
  return new Map(rows.map((row) => [row.tag, row.id]));
}
