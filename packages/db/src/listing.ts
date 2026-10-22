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
}
