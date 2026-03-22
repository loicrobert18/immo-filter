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

function formatListingHtml(listing: Listing): string {
  const parts = [
    `<h3><a href="${listing.url}">${listing.platform}</a></h3>`,
    `<ul>`,
    listing.price != null ? `<li>Prix : ${listing.price.toLocaleString("fr-FR")} €</li>` : "",
    listing.surface != null ? `<li>Surface : ${listing.surface} m²</li>` : "",
    listing.rooms != null ? `<li>Pièces : ${listing.rooms}</li>` : "",
    listing.city ? `<li>Ville : ${listing.city}</li>` : "",
    listing.address ? `<li>Adresse : ${listing.address}</li>` : "",
    `</ul>`,
  ];
  return parts.filter(Boolean).join("\n");
}

export async function sendNotification(newListings: Listing[]): Promise<void> {
  if (newListings.length === 0) return;

  const to = process.env["NOTIFY_TO"];
  const from = process.env["NOTIFY_FROM"];

  if (!to || !from) {
    throw new Error("NOTIFY_TO and NOTIFY_FROM are required");
  }

  const transport = getTransport();
  const html = newListings.map(formatListingHtml).join("<hr>\n");

  try {
    await transport.sendMail({
      from,
      to,
      subject: `ImmoFilter : ${newListings.length} nouvelle(s) annonce(s)`,
      html,
    });
    console.log(`[Notify] Sent ${newListings.length} listing(s) to ${to}`);
  } catch (error) {
    console.error("[Notify] Error sending notification:", error);
  }
}
