/**
 * Outbound email (SMTP mailer only; sendmail is configurable but not sent).
 *
 * Host/port/username/encryption/from persist in admin (SmtpConfiguration).
 * The password is never stored in the database — it comes from the
 * SMTP_PASSWORD env var. Missing config or credentials fail closed.
 */
import nodemailer from "nodemailer";
import { getAdminSmtpConfig } from "@/lib/smtp/config";

export type SendMailResult = { ok: true } | { ok: false; formError: string };

export async function sendMail(input: {
  to: string;
  subject: string;
  text: string;
  /** Optional rich body. Most clients prefer this over `text` when both are
   * present; `text` still matters as the plain-text fallback. */
  html?: string;
  attachments?: { filename: string; content: Buffer }[];
  /**
   * Overrides the Admin-configured from address for this message only — the
   * SMTP connection still authenticates as the one configured account
   * (Postfix doesn't restrict which mailbox an authenticated sender may
   * claim in the From header, and DKIM signs by domain, not mailbox, so
   * this is a display-only identity change, not a second set of
   * credentials). Falls back to the configured from address when omitted.
   */
  from?: { address: string; name?: string };
}): Promise<SendMailResult> {
  const config = await getAdminSmtpConfig();

  if (config.mailerType !== "smtp") {
    return { ok: false, formError: "SMTP mailer is not selected." };
  }
  if (!config.host) {
    return { ok: false, formError: "SMTP host is not configured." };
  }
  const password = process.env.SMTP_PASSWORD?.trim();
  if (!password) {
    return { ok: false, formError: "SMTP_PASSWORD is not set." };
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.encryption === "ssl",
    requireTLS: config.encryption === "tls",
    auth: config.username ? { user: config.username, pass: password } : undefined,
  });

  const fromAddress = input.from?.address || config.fromAddress || config.username;
  if (!fromAddress) {
    return { ok: false, formError: "SMTP from address is not configured." };
  }
  const fromName = input.from?.name ?? config.fromName;
  const from = fromName ? `"${fromName}" <${fromAddress}>` : fromAddress;

  try {
    await transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      attachments: input.attachments,
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      formError: error instanceof Error ? error.message : "Mail send failed.",
    };
  }
}

/** Fire-and-forget — mail delivery must not fail the caller's mutation. */
export function sendMailSafe(input: Parameters<typeof sendMail>[0]): void {
  void sendMail(input).catch(() => {
    // Delivery failures must not affect the calling mutation.
  });
}
