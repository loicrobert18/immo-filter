import "dotenv/config";
import { ImapFlow } from "imapflow";
import { simpleParser, type Source } from "mailparser";
import * as cheerio from "cheerio";

async function main() {
  const client = new ImapFlow({
    host: process.env["IMAP_HOST"]!,
    port: Number(process.env["IMAP_PORT"] || 993),
    auth: { user: process.env["IMAP_USER"]!, pass: process.env["IMAP_PASSWORD"]! },
    secure: true,
    logger: false,
  });

  await client.connect();
  const lock = await client.getMailboxLock("INBOX");

  const since = new Date();
  since.setDate(since.getDate() - 7);

  for await (const msg of client.fetch({ since }, { source: true, envelope: true })) {
    if (!msg.source) continue;
    const subject = msg.envelope.subject || "";
    if (!subject.includes("nouvelles annonces")) continue;

    const parsed = await simpleParser(msg.source as Source);
    const html = typeof parsed.html === "string" ? parsed.html : "";
    const $ = cheerio.load(html);

    // Find links with "Voir l'annonce" text - these are the listing links
    console.log("=== Listing blocks around 'Voir l'annonce' ===\n");
    $("a").filter((_i, el) => $(el).text().trim() === "Voir l'annonce").each((_i, el) => {
      const link = $(el).attr("href") || "";
      // Walk up to find the containing block
      const container = $(el).closest("table").parent().closest("table").parent().closest("table");
      const text = container.text().replace(/\s+/g, " ").trim();
      console.log(`Link: ${link.substring(0, 80)}...`);
      console.log(`Container text: ${text.substring(0, 300)}`);
      console.log();
    });

    // Also look for price patterns
    console.log("\n=== Elements containing € ===\n");
    $("*").filter((_i, el) => {
      const t = $(el).children().length === 0 ? $(el).text().trim() : "";
      return t.includes("€") && t.length < 50;
    }).each((_i, el) => {
      const text = $(el).text().trim();
      const tag = (el as cheerio.TagElement).tagName;
      const parent = $(el).parent();
      const parentTag = parent.length ? (parent[0] as cheerio.TagElement).tagName : "?";
      console.log(`  <${tag}> in <${parentTag}>: "${text}"`);
    });

    // Look for m² patterns
    console.log("\n=== Elements containing m² ===\n");
    $("*").filter((_i, el) => {
      const t = $(el).children().length === 0 ? $(el).text().trim() : "";
      return t.includes("m²") && t.length < 80;
    }).each((_i, el) => {
      const text = $(el).text().trim();
      const tag = (el as cheerio.TagElement).tagName;
      console.log(`  <${tag}>: "${text}"`);
    });

    // Look for "pièce" patterns
    console.log("\n=== Elements containing 'pièce' ===\n");
    $("*").filter((_i, el) => {
      const t = $(el).children().length === 0 ? $(el).text().trim() : "";
      return t.includes("pièce") && t.length < 80;
    }).each((_i, el) => {
      const text = $(el).text().trim();
      const tag = (el as cheerio.TagElement).tagName;
      console.log(`  <${tag}>: "${text}"`);
    });

    break;
  }

  lock.release();
  await client.logout();
}

main().catch(console.error);
