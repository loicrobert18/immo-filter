import { formatDateTime, formatPrice, formatPricePerM2 } from "@/lib/format";
import type { ListingWithSearches } from "@/lib/queries/listings";
import { PlatformBadge } from "./platform-badge";
import { SearchBadge } from "./search-badge";

export function ListingCard({ listing }: { listing: ListingWithSearches }) {
  const pricePerM2 = formatPricePerM2(listing.price, listing.surface);
  const details = [
    listing.surface != null ? `${listing.surface} m²` : null,
    listing.rooms != null ? `${listing.rooms} pièce${listing.rooms > 1 ? "s" : ""}` : null,
  ].filter(Boolean);

  return (
    <a
      href={listing.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-surface-1 transition hover:border-accent"
    >
      <div className="aspect-[4/3] bg-surface-0">
        {listing.imageUrl ? (
          // Image hosts vary per platform, so next/image remote patterns are not worth maintaining
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.imageUrl} alt="" loading="lazy" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-sm text-muted">Pas de photo</div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-lg font-semibold">{formatPrice(listing.price)}</span>
          {pricePerM2 && <span className="text-xs text-muted">{pricePerM2}</span>}
        </div>
        {details.length > 0 && <p className="text-sm text-secondary">{details.join(" · ")}</p>}
        <p className="text-sm font-medium">{listing.city ?? "Ville inconnue"}</p>
        {listing.title && <p className="line-clamp-2 text-sm text-secondary">{listing.title}</p>}
        {listing.searches.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {listing.searches.map((search) => (
              <SearchBadge key={search.tag} label={search.label} />
            ))}
          </div>
        )}
        <div className="mt-auto flex items-center justify-between pt-2">
          <PlatformBadge platform={listing.platform} />
          <span className="text-xs text-muted">{formatDateTime(listing.detectedAt)}</span>
        </div>
      </div>
    </a>
  );
}
