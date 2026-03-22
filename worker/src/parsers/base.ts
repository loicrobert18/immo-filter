import type { Listing } from "../types/listing.js";

export interface BaseParser {
  platform: string;
  senderPatterns: string[];
  parse(html: string): Listing[];
}
