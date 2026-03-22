export interface Listing {
  url: string;
  price: number | null;
  surface: number | null;
  rooms: number | null;
  city: string | null;
  address: string | null;
  platform: string;
  dedupHash: string;
  detectedAt: Date;
}
