import "dotenv/config";
import { ImapFlow } from "imapflow";
import { simpleParser, type Source } from "mailparser";

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

  for await (const msg of client.fetch({ since }, { source: true })) {
    if (!msg.source) continue;
    const parsed = await simpleParser(msg.source as Source);
    const from = parsed.from?.text ?? "";
    const fromLower = from.toLowerCase();

    console.log("Raw from:", JSON.stringify(from));
    console.log("Char codes:", [...fromLower].map((c, i) => `${i}:${c}(${c.charCodeAt(0).toString(16)})`).join(" "));
    console.log("includes @seloger.com:", fromLower.includes("@seloger.com"));
    console.log("includes alertes.seloger:", fromLower.includes("@alertes.seloger.com"));
    console.log("includes seloger.com:", fromLower.includes("seloger.com"));
    break; // just first mail
  }

  lock.release();
  await client.logout();
}

main().catch(console.error);
