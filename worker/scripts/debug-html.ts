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
    // Pick first mail with "nouvelles annonces"
    if (!subject.includes("nouvelles annonces")) continue;

    const parsed = await simpleParser(msg.source as Source);
    const html = typeof parsed.html === "string" ? parsed.html : "";
    const $ = cheerio.load(html);

    console.log("Subject:", subject);
    console.log("\n=== All <a> hrefs containing seloger ===");
    $("a").each((_i, el) => {
      const href = $(el).attr("href") || "";
      if (href.toLowerCase().includes("seloger")) {
        const text = $(el).text().trim().substring(0, 100);
        console.log(`  href: ${href.substring(0, 200)}`);
        console.log(`  text: ${text}`);
        console.log();
      }
    });

    console.log("\n=== All <a> hrefs (first 30) ===");
    $("a").slice(0, 30).each((_i, el) => {
      const href = $(el).attr("href") || "";
      console.log(`  ${href.substring(0, 200)}`);
    });

    break;
  }

  lock.release();
  await client.logout();
}

main().catch(console.error);
