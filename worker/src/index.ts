import "dotenv/config";
import cron from "node-cron";
import { fetchAllMails, deleteMails } from "./imap/client.js";
import { findParser } from "./parsers/registry.js";
import { filterNewListings, getUnnotifiedListings, markAsNotified } from "./dedup/engine.js";
import { sendNotification } from "./notify/mailer.js";
import { isSaveRequest, processSaveRequests } from "./save/handler.js";
import { extractAlias } from "./imap/alias.js";
import { loadSearchIndex } from "./searches/resolver.js";
import type { RawMail } from "./imap/client.js";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Listing } from "@immofilter/db";

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

  let mails: RawMail[];
  try {
    mails = await fetchAllMails();
  } catch (error) {
    console.error("[Pipeline] Error fetching mails:", error);
    return;
  }

  const saveMails = mails.filter((m) => isSaveRequest(m));
  const alertMails = mails.filter((m) => !isSaveRequest(m));
  console.log(`[Pipeline] Fetched ${mails.length} mail(s): ${alertMails.length} alert(s), ${saveMails.length} save(s)`);

  // Track UIDs of successfully processed mails for deletion
  const processedUids: number[] = [];

  // --- Process SAVE requests ---
  if (saveMails.length > 0) {
    try {
      await processSaveRequests(saveMails);
      processedUids.push(...saveMails.map((m) => m.uid));
    } catch (error) {
      console.error("[Pipeline] Error processing save requests:", error);
    }
  }

  // --- Resolve searches (alias → search id) ---
  let searchIndex = new Map<string, number>();
  try {
    searchIndex = await loadSearchIndex();
  } catch (error) {
    console.error("[Pipeline] Error loading searches, listings will be unclassified:", error);
  }
  const baseAddress = process.env["IMAP_USER"] ?? "";

  function resolveSearchId(mail: RawMail): number | null {
    const alias = extractAlias(mail.recipients, baseAddress);
    if (!alias) return null;
    const searchId = searchIndex.get(alias);
    if (searchId == null) {
      console.warn(`[Pipeline] Alias "${alias}" has no matching search, listings left unclassified`);
      return null;
    }
    return searchId;
  }

  // --- Parse alert mails ---
  const allListings: Listing[] = [];
  const parsedMailUids: number[] = [];

  for (const mail of alertMails) {
    try {
      const parser = findParser(mail.from);
      if (!parser) {
        // Not an alert mail we recognize — leave it in the inbox
        continue;
      }

      const parsed = parser.parse(mail.html);
      if (parsed.length === 0) {
        console.warn(`[Pipeline] Parser ${parser.platform} returned 0 listings`);
        await saveFailedHtml(mail.from, mail.html);
        // Still delete — it's a known sender, just a parse failure
        parsedMailUids.push(mail.uid);
        continue;
      }

      const searchId = resolveSearchId(mail);
      console.log(`[Pipeline] ${parser.platform}: parsed ${parsed.length} listing(s)`);
      allListings.push(...parsed.map((listing) => ({ ...listing, searchId })));
      parsedMailUids.push(mail.uid);
    } catch (error) {
      console.error(`[Pipeline] Error parsing mail from ${mail.from}:`, error);
      await saveFailedHtml(mail.from, mail.html);
      parsedMailUids.push(mail.uid);
    }
  }

  // --- Dedup & store ---
  let newListings: Listing[] = [];
  if (allListings.length > 0) {
    try {
      newListings = await filterNewListings(allListings);
    } catch (error) {
      console.error("[Pipeline] Error during dedup:", error);
      return;
    }
  }

  // Delete processed mails from IMAP
  processedUids.push(...parsedMailUids);
  if (processedUids.length > 0) {
    try {
      await deleteMails(processedUids);
      console.log(`[Pipeline] Deleted ${processedUids.length} processed mail(s)`);
    } catch (error) {
      console.error("[Pipeline] Error deleting mails:", error);
    }
  }

  // --- Notify: unnotified rows include this run's new listings, previous failures and their search tags ---
  try {
    const unnotified = await getUnnotifiedListings();
    const retries = unnotified.length - newListings.length;
    if (retries > 0) {
      console.log(`[Pipeline] ${retries} previously unnotified listing(s) to retry`);
    }
    newListings = unnotified;
  } catch (error) {
    console.error("[Pipeline] Error fetching unnotified listings, notifying new ones without tags:", error);
  }

  if (newListings.length === 0) {
    console.log("[Pipeline] No new listings to notify");
    return;
  }

  console.log(`[Pipeline] ${newListings.length} new listing(s) to notify`);

  try {
    const sentIds = await sendNotification(newListings);
    await markAsNotified(sentIds);
  } catch (error) {
    console.error("[Pipeline] Error sending notification:", error);
  }
}

// Run every day at 8:00 AM
cron.schedule("0 8 * * *", () => {
  processMails().catch((error) =>
    console.error("[Cron] Unhandled error:", error)
  );
});

console.log("[ImmoFilter] Worker started, scheduling every day at 8:00 AM");

// Run once on startup
processMails().catch((error) =>
  console.error("[Startup] Unhandled error:", error)
);
