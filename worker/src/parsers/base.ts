import type { Listing } from "@immofilter/db";

export interface BaseParser {
  platform: string;
  senderPatterns: string[];
  parse(html: string): Listing[];
}
