import "dotenv/config";
import cron from "node-cron";
import { fetchNewMails } from "./imap/client.js";
import { findParser } from "./parsers/registry.js";
import { filterNewListings } from "./dedup/engine.js";
import { sendNotification } from "./notify/mailer.js";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Listing } from "./types/listing.js";

const FAILED_DIR = join(process.cwd(), "data", "failed");

async function saveFailedHtml(from: string, html: string): Promise<void> {
  try {
    await mkdir(FAILED_DIR, { recursive: true });
    const filename = `${Date.now()}_${from.replace(/[^a-zA-Z0-9]/g, "_")}.html`;
    await writeFile(join(FAILED_DIR, filename), html, "utf-8");
  } catch (error) {
    console.error("[Failed] Error saving failed HTML:", error);
  }
}

async function processMails(): Promise<void> {
  console.log(`[${new Date().toISOString()}] Starting mail processing...`);

  let mails;
  try {
    mails = await fetchNewMails();
  } catch (error) {
    console.error("[Pipeline] Error fetching mails:", error);
    return;
  }

  console.log(`[Pipeline] Fetched ${mails.length} new mail(s)`);

  const allListings: Listing[] = [];

  for (const mail of mails) {
    try {
      const parser = findParser(mail.from);
      if (!parser) {
        console.log(`[Pipeline] No parser found for: ${mail.from}`);
        continue;
      }

      const parsed = parser.parse(mail.html);
      if (parsed.length === 0) {
        console.warn(`[Pipeline] Parser ${parser.platform} returned 0 listings`);
        await saveFailedHtml(mail.from, mail.html);
        continue;
      }

      console.log(`[Pipeline] ${parser.platform}: parsed ${parsed.length} listing(s)`);
      allListings.push(...parsed);
    } catch (error) {
      console.error(`[Pipeline] Error parsing mail from ${mail.from}:`, error);
      await saveFailedHtml(mail.from, mail.html);
    }
  }

  if (allListings.length === 0) {
    console.log("[Pipeline] No listings found, skipping dedup & notify");
    return;
  }

  let newListings: Listing[];
  try {
    newListings = await filterNewListings(allListings);
  } catch (error) {
    console.error("[Pipeline] Error during dedup:", error);
    return;
  }

  console.log(`[Pipeline] ${newListings.length} new listing(s) after dedup`);

  try {
    await sendNotification(newListings);
  } catch (error) {
    console.error("[Pipeline] Error sending notification:", error);
  }
}

// Run every 30 minutes
cron.schedule("*/30 * * * *", () => {
  processMails().catch((error) =>
    console.error("[Cron] Unhandled error:", error)
  );
});

console.log("[ImmoFilter] Worker started, scheduling every 30 minutes");

// Run once on startup
processMails().catch((error) =>
  console.error("[Startup] Unhandled error:", error)
);
