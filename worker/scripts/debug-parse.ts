import "dotenv/config";
import { ImapFlow } from "imapflow";
import { simpleParser, type Source } from "mailparser";
import { findParser } from "../src/parsers/registry.js";

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

  let count = 0;
  for await (const msg of client.fetch({ since }, { source: true, envelope: true })) {
    count++;
    if (!msg.source) continue;

    const parsed = await simpleParser(msg.source as Source);
    const from = parsed.from?.text ?? "";
    const html = typeof parsed.html === "string" ? parsed.html : (parsed.textAsHtml ?? "");
    const subject = msg.envelope.subject || "(no subject)";

    console.log(`\n--- Mail ${count}: ${subject} ---`);
    console.log(`From: ${from}`);

    const parser = findParser(from);
    if (!parser) {
      console.log("=> No parser matched");
      continue;
    }

    console.log(`=> Parser: ${parser.platform}`);
    const listings = parser.parse(html);
    console.log(`=> Listings found: ${listings.length}`);

    for (const l of listings) {
      console.log(`   - ${l.url} | ${l.price}€ | ${l.surface}m² | ${l.rooms}p | ${l.city}`);
    }

    if (listings.length === 0) {
      // Show first 500 chars of HTML for debug
      console.log(`=> HTML preview: ${html.substring(0, 500)}`);
    }

    // Only debug first 3 mails with parser match
    if (count >= 3) break;
  }

  lock.release();
  await client.logout();
}

main().catch(console.error);
