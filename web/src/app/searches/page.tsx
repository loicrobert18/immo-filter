import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { DeleteSearchButton } from "@/components/delete-search-button";
import { SearchForm } from "@/components/search-form";
import { formatDateTime, formatNumber } from "@/lib/format";
import { listSearchesWithCounts } from "@/lib/queries/searches";
import { aliasAddress } from "@/lib/search-schema";

export const dynamic = "force-dynamic";

export default async function SearchesPage() {
  const searches = await listSearchesWithCounts();
  const baseAddress = process.env["IMAP_USER"] ?? "";

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-lg border border-border bg-surface-1 p-4">
        <h1 className="font-semibold">Nouvelle recherche</h1>
        <p className="mb-4 text-sm text-secondary">
          Chaque recherche a sa propre adresse d&apos;alerte. Renseigne-la comme e-mail lors de la création de
          l&apos;alerte sur SeLoger, Leboncoin, Bien&apos;ici ou PAP : les annonces reçues seront classées sous ce tag.
        </p>
        <SearchForm />
      </section>

      {searches.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-10 text-center text-secondary">
          Aucune recherche pour l&apos;instant. Les annonces reçues sur l&apos;adresse principale sont « Non classé ».
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {searches.map((search) => {
            const address = aliasAddress(baseAddress, search.tag);
            return (
              <li key={search.id} className="rounded-lg border border-border bg-surface-1 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <h2 className="font-semibold">{search.label}</h2>
                    {address ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <code className="break-all rounded bg-surface-0 px-1.5 py-0.5 text-sm">{address}</code>
                        <CopyButton value={address} />
                      </div>
                    ) : (
                      <code className="text-sm text-secondary">+{search.tag}</code>
                    )}
                    <p className="text-sm text-secondary">
                      {formatNumber(search.listingCount)} annonce{search.listingCount > 1 ? "s" : ""}
                      {search.lastDetectedAt && ` · dernière le ${formatDateTime(search.lastDetectedAt)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Link
                      href={`/listings?search=${encodeURIComponent(search.tag)}`}
                      className="text-sm text-accent hover:underline"
                    >
                      Voir les annonces
                    </Link>
                    <DeleteSearchButton id={search.id} label={search.label} />
                  </div>
                </div>
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm text-secondary">Modifier</summary>
                  <div className="mt-3">
                    <SearchForm search={{ id: search.id, tag: search.tag, label: search.label }} />
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
