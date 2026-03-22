import "dotenv/config";
import { ImapFlow } from "imapflow";

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
  for await (const msg of client.fetch({ since }, { envelope: true, flags: true })) {
    count++;
    const env = msg.envelope;
    const flags = [...msg.flags].join(", ");
    const from = env.from?.[0]?.address || "unknown";
    const subject = env.subject || "(no subject)";
    const date = env.date?.toISOString() || "unknown";
    console.log(`[${count}] ${date} | From: ${from} | Flags: ${flags} | Subject: ${subject}`);
  }

  console.log(`\nTotal: ${count} mail(s) in last 7 days`);

  lock.release();
  await client.logout();
}

main().catch(console.error);
