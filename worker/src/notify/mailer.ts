import nodemailer from "nodemailer";
import type { Listing, SearchTag } from "@immofilter/db";

function getTransport() {
  const host = process.env["SMTP_HOST"];
  const port = Number(process.env["SMTP_PORT"] || "587");
  const user = process.env["SMTP_USER"];
  const pass = process.env["SMTP_PASSWORD"];

  if (!host || !user || !pass) {
    throw new Error("SMTP_HOST, SMTP_USER, and SMTP_PASSWORD are required");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return Buffer.from(await response.arrayBuffer());
  } catch {
    return null;
  }
}

export function formatPlatformLabel(platform: string): string {
  const labels: Record<string, string> = {
    seloger: "SeLoger",
    leboncoin: "LeBonCoin",
    bienici: "Bien'ici",
    pap: "PAP",
  };
  return labels[platform] ?? platform;
}

export function buildFallbackTitle(listing: Listing): string | null {
  const parts: string[] = [];
  if (listing.rooms != null) parts.push(`${listing.rooms} pièce${listing.rooms > 1 ? "s" : ""}`);
  if (listing.surface != null) parts.push(`${listing.surface} m²`);
  if (listing.city) parts.push(listing.city);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

export function formatSearchBadges(tags: SearchTag[] | undefined): string {
  if (!tags || tags.length === 0) return "";
  const badges = tags.map(
    (tag) =>
      `<span style="display:inline-block; margin:0 6px 6px 0; padding:2px 10px; background:#eef4fc; color:#1d5fae; border-radius:999px; font-size:12px; font-weight:600;">${escapeHtml(tag.label)}</span>`
  );
  return `<div style="margin-top:10px;">${badges.join("")}</div>`;
}

export function formatListingHtml(listing: Listing, index: number, saveMailto: string): string {
  const platformLabel = formatPlatformLabel(listing.platform);

  const imageSection = listing.imageUrl
    ? `<a href="${listing.url}" style="text-decoration:none; display:block; position:relative;">
        <div style="position:relative; width:320px;">
          <img src="cid:listing-${index}" width="320" style="border-radius:10px; display:block;">
          <div style="position:absolute; top:0; left:0; right:0; text-align:center; padding:6px 0;">
            <span style="background:rgba(0,0,0,0.6); color:#fff; font-size:12px; font-weight:600; padding:4px 14px; border-radius:0 0 8px 8px; letter-spacing:0.5px;">
              ${platformLabel}
            </span>
          </div>
        </div>
      </a>`
    : `<div style="background:#f0f0f0; border-radius:10px; width:320px; height:60px; display:flex; align-items:center; justify-content:center;">
        <span style="color:#888; font-size:13px; font-weight:600;">${platformLabel}</span>
      </div>`;

  const titleText = listing.title ?? buildFallbackTitle(listing);
  const title = titleText
    ? `<a href="${listing.url}" style="text-decoration:none; color:#1a1a1a;">
        <h3 style="margin:10px 0 6px 0; font-size:16px; font-weight:600;">${titleText}</h3>
      </a>`
    : "";

  const details: string[] = [];
  if (listing.price != null) details.push(`<strong>${listing.price.toLocaleString("fr-FR")} &euro;</strong>`);
  if (listing.surface != null) details.push(`${listing.surface} m&sup2;`);
  if (listing.rooms != null) details.push(`${listing.rooms} pi&egrave;ce${listing.rooms > 1 ? "s" : ""}`);
  if (listing.city) details.push(listing.city);
  if (listing.address) details.push(listing.address);

  const detailsHtml = details.length > 0
    ? `<p style="margin:6px 0 0 0; font-size:14px; color:#444; line-height:1.5;">${details.join(" &middot; ")}</p>`
    : "";

  const saveSubject = encodeURIComponent(`SAVE:${listing.id}`);
  const saveButton = saveMailto && listing.id != null
    ? `<a href="mailto:${saveMailto}?subject=${saveSubject}" style="display:inline-block; margin-top:12px; padding:8px 18px; background:#2563eb; color:#fff; text-decoration:none; border-radius:6px; font-size:13px; font-weight:600;">Sauvegarder</a>`
    : "";

  return `<div style="padding:40px 0;">
    ${imageSection}
    ${formatSearchBadges(listing.searches)}
    ${title}
    ${detailsHtml}
    ${saveButton}
  </div>`;
}

const BATCH_SIZE = 5;

export interface SearchGroup {
  // null = listings that came through no known alias ("Non classé")
  search: SearchTag | null;
  listings: Listing[];
}

// One group per search, keyed by the listing's first search; unclassified listings go last
export function groupBySearch(items: Listing[]): SearchGroup[] {
  const groups = new Map<string | null, SearchGroup>();
  for (const listing of items) {
    const search = listing.searches?.[0] ?? null;
    const key = search?.tag ?? null;
    const group = groups.get(key) ?? { search, listings: [] };
    group.listings.push(listing);
    groups.set(key, group);
  }

  return [...groups.values()].sort((a, b) => {
    if (!a.search) return 1;
    if (!b.search) return -1;
    return a.search.label.localeCompare(b.search.label, "fr");
  });
}

export interface NotificationBatch {
  search: SearchTag | null;
  listings: Listing[];
  // 1-based position within its search group
  index: number;
  total: number;
}

export function buildBatches(items: Listing[], size: number = BATCH_SIZE): NotificationBatch[] {
  return groupBySearch(items).flatMap((group) => {
    const total = Math.ceil(group.listings.length / size);
    return Array.from({ length: total }, (_, b) => ({
      search: group.search,
      listings: group.listings.slice(b * size, (b + 1) * size),
      index: b + 1,
      total,
    }));
  });
}

export function formatBatchSubject(batch: NotificationBatch): string {
  const count = batch.listings.length;
  const searchLabel = batch.search ? ` [${batch.search.label}]` : "";
  const batchLabel = batch.total > 1 ? ` (${batch.index}/${batch.total})` : "";
  return `ImmoFilter${searchLabel} : ${count} nouvelle(s) annonce(s)${batchLabel}`;
}

// `to` comes from the web settings, falling back to NOTIFY_TO
export async function sendNotification(newListings: Listing[], to: string | null): Promise<number[]> {
  if (newListings.length === 0) return [];

  const from = process.env["NOTIFY_FROM"];
  const saveMailto = process.env["IMAP_USER"] ?? from ?? "";

  if (!to || !from) {
    throw new Error("A recipient (settings or NOTIFY_TO) and NOTIFY_FROM are required");
  }

  const transport = getTransport();
  const sentIds: number[] = [];
  const batches = buildBatches(newListings);

  for (let b = 0; b < batches.length; b++) {
    const current = batches[b]!;
    const { listings: batch, search, index, total } = current;

    const attachments: { filename: string; content: Buffer; cid: string }[] = [];
    for (let i = 0; i < batch.length; i++) {
      const listing = batch[i]!;
      if (!listing.imageUrl) continue;

      const imageData = await downloadImage(listing.imageUrl);
      if (!imageData) continue;

      attachments.push({
        filename: `listing-${i}.png`,
        content: imageData,
        cid: `listing-${i}`,
      });
    }

    const separator = `<div style="border-top:1px solid #e0e0e0; margin:8px 0;"></div>`;
    const listingsHtml = batch.map((l, i) => formatListingHtml(l, i, saveMailto)).join(separator);
    const count = batch.length;
    const batchLabel = total > 1 ? ` (${index}/${total})` : "";
    const searchHeading = `<p style="font-size:13px; color:#666; margin:0;">${search ? escapeHtml(search.label) : "Non class&eacute;"}</p>`;

    const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; max-width:400px; margin:0 auto; padding:16px;">
      ${searchHeading}
      <h2 style="font-size:18px; color:#1a1a1a; margin:4px 0 8px 0;">${count} nouvelle${count > 1 ? "s" : ""} annonce${count > 1 ? "s" : ""}${batchLabel}</h2>
      ${listingsHtml}
    </div>`;

    try {
      await transport.sendMail({
        from,
        to,
        subject: formatBatchSubject(current),
        html,
        attachments,
      });
      console.log(`[Notify] Sent batch ${b + 1}/${batches.length} (${count} listing(s)) to ${to}`);
      const ids = batch.map((l) => l.id).filter((id): id is number => id != null);
      sentIds.push(...ids);
    } catch (error) {
      console.error(`[Notify] Error sending batch ${b + 1}/${batches.length}:`, error);
    }
  }

  return sentIds;
}

export async function sendSavedListingEmail(listing: Listing, to: string | null): Promise<void> {
  const from = process.env["NOTIFY_FROM"];

  if (!to || !from) {
    throw new Error("A recipient (settings or NOTIFY_TO) and NOTIFY_FROM are required");
  }

  const attachments: { filename: string; content: Buffer; cid: string }[] = [];

  if (listing.imageUrl) {
    const imageData = await downloadImage(listing.imageUrl);
    if (imageData) {
      attachments.push({
        filename: "listing-0.png",
        content: imageData,
        cid: "listing-0",
      });
    }
  }

  const transport = getTransport();
  const listingHtml = formatListingHtml(listing, 0, "");

  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; max-width:400px; margin:0 auto; padding:16px;">
    <h2 style="font-size:18px; color:#1a1a1a; margin-bottom:8px;">&#11088; Annonce sauvegard&eacute;e</h2>
    ${listingHtml}
  </div>`;

  await transport.sendMail({
    from,
    to,
    subject: "ImmoFilter - Annonce sauvegardée",
    html,
    attachments,
  });
}
