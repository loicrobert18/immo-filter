import { eq } from "drizzle-orm";
import { getDb, listings, type Listing } from "@immofilter/db";
import type { RawMail } from "../imap/client.js";
import { sendSavedListingEmail } from "../notify/mailer.js";

const SAVE_PATTERN = /^SAVE:(\d+)$/;

export function isSaveRequest(mail: RawMail): boolean {
  return SAVE_PATTERN.test(mail.subject.trim());
}

function extractListingId(mail: RawMail): number | null {
  const match = mail.subject.trim().match(SAVE_PATTERN);
  return match ? Number(match[1]) : null;
}

export async function processSaveRequests(mails: RawMail[], to: string | null): Promise<void> {
  const saveRequests = mails.filter(isSaveRequest);
  if (saveRequests.length === 0) return;

  console.log(`[Save] Processing ${saveRequests.length} save request(s)`);

  for (const mail of saveRequests) {
    try {
      const id = extractListingId(mail);
      if (id == null) {
        console.warn("[Save] Could not extract listing ID");
        continue;
      }

      const rows = await getDb()
        .select()
        .from(listings)
        .where(eq(listings.id, id))
        .limit(1);

      if (rows.length === 0) {
        console.warn(`[Save] Listing not found in DB: id=${id}`);
        continue;
      }

      const row = rows[0]!;
      const listing: Listing = {
        id: row.id,
        url: row.url,
        title: row.title ?? null,
        price: row.price,
        surface: row.surface,
        rooms: row.rooms,
        city: row.city ?? null,
        address: row.address ?? null,
        imageUrl: row.imageUrl ?? null,
        platform: row.platform,
        dedupHash: row.dedupHash,
        detectedAt: row.detectedAt,
      };

      await sendSavedListingEmail(listing, to);
      console.log(`[Save] Sent saved listing: id=${id}`);
    } catch (error) {
      console.error("[Save] Error processing save request:", error);
    }
  }
}
