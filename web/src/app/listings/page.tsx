import { ListingCard } from "@/components/listing-card";
import { ListingFilters } from "@/components/listing-filters";
import { Pagination } from "@/components/pagination";
import { parseListingFilters, type SearchParams } from "@/lib/filters";
import { formatNumber } from "@/lib/format";
import { getFilterChoices, searchListings } from "@/lib/queries/listings";

export const dynamic = "force-dynamic";

export default async function ListingsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const filters = parseListingFilters(params);
  const [result, choices] = await Promise.all([searchListings(filters), getFilterChoices()]);

  return (
    <div className="flex flex-col gap-5">
      <ListingFilters
        key={JSON.stringify(filters)}
        filters={filters}
        cities={choices.cities}
        platforms={choices.platforms}
      />

      <p className="text-sm text-secondary">
        {formatNumber(result.total)} annonce{result.total > 1 ? "s" : ""}
      </p>

      {result.items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-10 text-center text-secondary">
          Aucune annonce ne correspond à ces filtres.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {result.items.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}

      <Pagination page={filters.page} pageCount={result.pageCount} searchParams={params} basePath="/listings" />
    </div>
  );
}
