import "dotenv/config";
import { ImapFlow } from "imapflow";
import { simpleParser, type Source } from "mailparser";

const client = new ImapFlow({
  host: process.env["IMAP_HOST"]!,
  port: Number(process.env["IMAP_PORT"] || "993"),
  auth: { user: process.env["IMAP_USER"]!, pass: process.env["IMAP_PASSWORD"]! },
  secure: true,
  logger: false,
});

await client.connect();
const lock = await client.getMailboxLock("INBOX");

for await (const message of client.fetch({ seen: false }, { source: true })) {
  if (!message.source) continue;
  const parsed = await simpleParser(message.source as Source);
  console.log("=== MAIL ===");
  console.log("Subject:", parsed.subject);
  console.log("Text:", JSON.stringify(parsed.text));
  console.log("HTML:", JSON.stringify(parsed.html)?.slice(0, 500));
  console.log("============");
}

lock.release();
await client.logout();
process.exit(0);
