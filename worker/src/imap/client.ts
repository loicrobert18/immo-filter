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

async function fetchAndMarkMails(client: ImapFlow, query: Record<string, boolean>): Promise<RawMail[]> {
  const mails: RawMail[] = [];

  for await (const message of client.fetch(query, { source: true })) {
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

  if (mails.length > 0) {
    const uids = mails.map((m) => m.uid);
    await client.messageFlagsAdd({ uid: uids.join(",") }, ["\\Seen"], { uid: true });
  }

  return mails;
}

export async function fetchNewMails(): Promise<RawMail[]> {
  const client = new ImapFlow(getImapConfig());
  const mails: RawMail[] = [];

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    try {
      mails.push(...await fetchAndMarkMails(client, { seen: false }));
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (error) {
    console.error("[IMAP] Error fetching mails:", error);
  }

  return mails;
}

export async function startSaveListener(onSaveMails: (mails: RawMail[]) => Promise<void>): Promise<void> {
  const config = getImapConfig();

  async function connect(): Promise<void> {
    const client = new ImapFlow(config);

    try {
      await client.connect();
      console.log("[IMAP-IDLE] Connected, listening for SAVE requests...");
      const lock = await client.getMailboxLock("INBOX");

      try {
        // Process any existing unseen SAVE mails on connect
        const existing = await fetchAndMarkMails(client, { seen: false });
        const saveMails = existing.filter((m) => /^SAVE:\d+$/.test(m.subject.trim()));
        if (saveMails.length > 0) {
          await onSaveMails(saveMails);
        }

        // Listen for new messages via IDLE
        client.on("exists", async () => {
          try {
            const newMails = await fetchAndMarkMails(client, { seen: false });
            const saveMails = newMails.filter((m) => /^SAVE:\d+$/.test(m.subject.trim()));
            if (saveMails.length > 0) {
              await onSaveMails(saveMails);
            }
          } catch (error) {
            console.error("[IMAP-IDLE] Error processing new mail:", error);
          }
        });

        // Keep the connection alive — ImapFlow handles IDLE automatically
        await new Promise<void>((resolve) => {
          client.on("close", () => {
            console.log("[IMAP-IDLE] Connection closed");
            resolve();
          });
          client.on("error", (error: Error) => {
            console.error("[IMAP-IDLE] Connection error:", error);
            resolve();
          });
        });
      } finally {
        lock.release();
      }
    } catch (error) {
      console.error("[IMAP-IDLE] Error:", error);
    }

    // Reconnect after 5s on disconnect
    console.log("[IMAP-IDLE] Reconnecting in 5s...");
    await new Promise((resolve) => setTimeout(resolve, 5000));
    await connect();
  }

  await connect();
}
