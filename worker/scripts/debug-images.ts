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

    console.log("Subject:", subject, "\n");

    $("a").filter((_i, el) => $(el).text().trim() === "Voir l'annonce").each((_i, el) => {
      const container = $(el).closest("table").parent().closest("table").parent().closest("table");

      console.log(`--- Listing ${_i + 1} ---`);
      console.log("Container text:", container.text().replace(/\s+/g, " ").trim().substring(0, 200));

      // Find all img tags in the container
      container.find("img").each((_j, img) => {
        const src = $(img).attr("src") || "";
        const alt = $(img).attr("alt") || "";
        const width = $(img).attr("width") || "";
        const height = $(img).attr("height") || "";
        console.log(`  <img src="${src.substring(0, 150)}" alt="${alt}" width="${width}" height="${height}">`);
      });

      // Also check parent of container for images
      const outerContainer = container.parent().closest("table");
      console.log("  -- Images in outer container --");
      outerContainer.find("img").each((_j, img) => {
        const src = $(img).attr("src") || "";
        const alt = $(img).attr("alt") || "";
        if (src && !src.includes("tracking") && !src.includes("pixel")) {
          console.log(`  <img src="${src.substring(0, 150)}" alt="${alt}">`);
        }
      });

      console.log();
    });

    break;
  }

  lock.release();
  await client.logout();
}

main().catch(console.error);
