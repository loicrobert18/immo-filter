export interface SearchTag {
  tag: string;
  label: string;
}

export interface Listing {
  id?: number;
  url: string;
  title: string | null;
  price: number | null;
  surface: number | null;
  rooms: number | null;
  city: string | null;
  address: string | null;
  imageUrl: string | null;
  platform: string;
  dedupHash: string;
  detectedAt: Date;
  // Ingestion context: the search resolved from the mail alias, stored in listing_searches
  searchId?: number | null;
  // Searches the listing is linked to, loaded for notification
  searches?: SearchTag[];
}
