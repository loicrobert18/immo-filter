import nodemailer from "nodemailer";
import type { Listing } from "../types/listing.js";

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
    ${title}
    ${detailsHtml}
    ${saveButton}
  </div>`;
}

export async function sendNotification(newListings: Listing[]): Promise<void> {
  if (newListings.length === 0) return;

  const to = process.env["NOTIFY_TO"];
  const from = process.env["NOTIFY_FROM"];
  const saveMailto = process.env["IMAP_USER"] ?? from ?? "";

  if (!to || !from) {
    throw new Error("NOTIFY_TO and NOTIFY_FROM are required");
  }

  const attachments: { filename: string; content: Buffer; cid: string }[] = [];

  for (let i = 0; i < newListings.length; i++) {
    const listing = newListings[i]!;
    if (!listing.imageUrl) continue;

    const imageData = await downloadImage(listing.imageUrl);
    if (!imageData) continue;

    attachments.push({
      filename: `listing-${i}.png`,
      content: imageData,
      cid: `listing-${i}`,
    });
  }

  const transport = getTransport();
  const separator = `<div style="border-top:1px solid #e0e0e0; margin:8px 0;"></div>`;
  const listingsHtml = newListings.map((l, i) => formatListingHtml(l, i, saveMailto)).join(separator);
  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; max-width:400px; margin:0 auto; padding:16px;">
    <h2 style="font-size:18px; color:#1a1a1a; margin-bottom:8px;">${newListings.length} nouvelle${newListings.length > 1 ? "s" : ""} annonce${newListings.length > 1 ? "s" : ""}</h2>
    ${listingsHtml}
  </div>`;

  try {
    await transport.sendMail({
      from,
      to,
      subject: `ImmoFilter : ${newListings.length} nouvelle(s) annonce(s)`,
      html,
      attachments,
    });
    console.log(`[Notify] Sent ${newListings.length} listing(s) to ${to}`);
  } catch (error) {
    console.error("[Notify] Error sending notification:", error);
  }
}

export async function sendSavedListingEmail(listing: Listing): Promise<void> {
  const to = process.env["NOTIFY_TO"];
  const from = process.env["NOTIFY_FROM"];

  if (!to || !from) {
    throw new Error("NOTIFY_TO and NOTIFY_FROM are required");
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
