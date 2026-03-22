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

  await client.messageFlagsRemove("1:*", ["\\Seen"]);
  console.log("All messages marked as unread");

  lock.release();
  await client.logout();
}

main().catch(console.error);
