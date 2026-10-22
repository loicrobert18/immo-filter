import Link from "next/link";
import type { SearchParams } from "@/lib/filters";

interface PaginationProps {
  page: number;
  pageCount: number;
  searchParams: SearchParams;
  basePath: string;
}

function pageHref(basePath: string, searchParams: SearchParams, page: number): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (key !== "page" && first) params.set(key, first);
  }
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function Pagination({ page, pageCount, searchParams, basePath }: PaginationProps) {
  if (pageCount <= 1) return null;

  const linkClass = "rounded-md border border-border bg-surface-1 px-3 py-1.5 text-sm hover:border-accent";
  const disabledClass = "rounded-md border border-border px-3 py-1.5 text-sm text-muted opacity-50";

  return (
    <nav className="flex items-center justify-center gap-3" aria-label="Pagination">
      {page > 1 ? (
        <Link href={pageHref(basePath, searchParams, page - 1)} className={linkClass}>
          ← Précédent
        </Link>
      ) : (
        <span className={disabledClass}>← Précédent</span>
      )}
      <span className="tabular text-sm text-secondary">
        Page {page} / {pageCount}
      </span>
      {page < pageCount ? (
        <Link href={pageHref(basePath, searchParams, page + 1)} className={linkClass}>
          Suivant →
        </Link>
      ) : (
        <span className={disabledClass}>Suivant →</span>
      )}
    </nav>
  );
}
