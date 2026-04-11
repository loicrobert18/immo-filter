import { ImapFlow } from "imapflow";
import { simpleParser, type Source } from "mailparser";

export interface RawMail {
  from: string;
  subject: string;
  html: string;
  uid: number;
}

function getImapConfig() {
  const host = process.env["IMAP_HOST"];
  const port = Number(process.env["IMAP_PORT"] || "993");
  const user = process.env["IMAP_USER"];
  const pass = process.env["IMAP_PASSWORD"];

  if (!host || !user || !pass) {
    throw new Error("IMAP_HOST, IMAP_USER, and IMAP_PASSWORD are required");
  }

  return { host, port, auth: { user, pass }, secure: true, logger: false as const };
}

export async function fetchAllMails(): Promise<RawMail[]> {
  const client = new ImapFlow(getImapConfig());
  const mails: RawMail[] = [];

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    try {
      for await (const message of client.fetch("1:*", { source: true })) {
        if (!message.source) continue;
        const parsed = await simpleParser(message.source as Source);
        const from = parsed.from?.text ?? "";
        const subject = parsed.subject ?? "";
        const html =
          typeof parsed.html === "string" ? parsed.html : (parsed.textAsHtml ?? "");

        if (from && html) {
          mails.push({ from, subject, html, uid: message.uid });
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (error) {
    console.error("[IMAP] Error fetching mails:", error);
  }

  return mails;
}

export async function deleteMails(uids: number[]): Promise<void> {
  if (uids.length === 0) return;

  const client = new ImapFlow(getImapConfig());

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    try {
      await client.messageDelete({ uid: uids.join(",") }, { uid: true });
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (error) {
    console.error("[IMAP] Error deleting mails:", error);
  }
}
