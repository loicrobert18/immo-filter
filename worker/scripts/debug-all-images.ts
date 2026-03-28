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

    // Find ALL images in the entire email with their context
    $("img").each((_i, el) => {
      const src = $(el).attr("src") || "";
      const alt = $(el).attr("alt") || "";
      const width = $(el).attr("width") || "";
      const height = $(el).attr("height") || "";
      const style = $(el).attr("style") || "";
      const parentTag = ($(el).parent()[0] as cheerio.TagElement)?.tagName || "?";
      const parentHref = $(el).parent().attr("href") || "";

      console.log(`[${_i}] <img width="${width}" height="${height}" alt="${alt}" style="${style.substring(0, 80)}">`);
      console.log(`     src: ${src.substring(0, 120)}`);
      console.log(`     parent: <${parentTag}${parentHref ? ` href="${parentHref.substring(0, 80)}..."` : ""}>`);
      console.log();
    });

    // Also check for background-image in style attributes
    console.log("\n=== Elements with background-image ===\n");
    $("[style*='background']").each((_i, el) => {
      const style = $(el).attr("style") || "";
      const tag = (el as cheerio.TagElement).tagName;
      if (style.includes("url(")) {
        console.log(`<${tag} style="${style.substring(0, 200)}">`);
      }
    });

    break;
  }

  lock.release();
  await client.logout();
}

main().catch(console.error);
