/**
 * Outbound SMS (best-effort per-provider HTTP calls).
 *
 * Reads the saved OtpSmsConfiguration (provider, sender id) plus the
 * SMS_API_KEY / SMS_API_SECRET env vars (never stored in DB). Field
 * mapping differs per provider:
 *  - ssl-wireless: SID = SMS_API_KEY, API token = SMS_API_SECRET
 *  - mim-sms: username = SMS_API_KEY, API key = SMS_API_SECRET
 *  - twilio: Account SID = SMS_API_KEY, Auth token = SMS_API_SECRET,
 *            sender id = the Twilio "from" number
 *  - messagebird: Access key = SMS_API_SECRET (SMS_API_KEY unused)
 *  - local-mock: never sends; always fails with an explanatory message
 *
 * SSL Wireless and Mim SMS request shapes are best-effort from their
 * public docs and are not verified against a live account here — check
 * the provider's current API reference before relying on this in
 * production. Twilio and MessageBird follow their stable public REST APIs.
 */
import { getAdminOtpConfig } from "@/lib/otp/config";

export type SendSmsResult = { ok: true } | { ok: false; formError: string };

function digitsOnly(raw: string): string {
  return raw.replace(/[^\d+]/g, "");
}

async function sendViaSslWireless(input: {
  to: string;
  message: string;
  sid?: string;
  token?: string;
}): Promise<SendSmsResult> {
  if (!input.sid || !input.token) {
    return {
      ok: false,
      formError: "SSL Wireless needs SMS_API_KEY (SID) and SMS_API_SECRET (API token).",
    };
  }
  const response = await fetch(
    "https://smsplus.sslwireless.com/api/v3/send-sms",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_token: input.token,
        sid: input.sid,
        msisdn: input.to,
        sms: input.message,
        csms_id: `th-otp-${Date.now()}`,
      }),
    },
  );
  const data = (await response.json().catch(() => null)) as {
    status?: string;
    error_message?: string;
  } | null;
  if (!response.ok || data?.status !== "SUCCESS") {
    return {
      ok: false,
      formError: data?.error_message || `SSL Wireless send failed (${response.status}).`,
    };
  }
  return { ok: true };
}

async function sendViaMimSms(input: {
  to: string;
  message: string;
  username?: string;
  apiKey?: string;
  senderId: string;
}): Promise<SendSmsResult> {
  if (!input.username || !input.apiKey) {
    return {
      ok: false,
      formError: "Mim SMS needs SMS_API_KEY (username) and SMS_API_SECRET (API key).",
    };
  }
  const params = new URLSearchParams({
    UserName: input.username,
    Apikey: input.apiKey,
    MobileNumber: input.to,
    Message: input.message,
    SenderName: input.senderId || "",
    TransactionType: "T",
  });
  const response = await fetch(
    `https://api.mimsms.com/api/SmsSending/SMS?${params.toString()}`,
  );
  const text = await response.text().catch(() => "");
  if (!response.ok || /error|fail/i.test(text)) {
    return {
      ok: false,
      formError: text || `Mim SMS send failed (${response.status}).`,
    };
  }
  return { ok: true };
}

async function sendViaTwilio(input: {
  to: string;
  message: string;
  accountSid?: string;
  authToken?: string;
  from: string;
}): Promise<SendSmsResult> {
  if (!input.accountSid || !input.authToken) {
    return {
      ok: false,
      formError:
        "Twilio needs SMS_API_KEY (Account SID) and SMS_API_SECRET (Auth token).",
    };
  }
  if (!input.from) {
    return {
      ok: false,
      formError: "Set a Sender ID (Twilio 'from' number) before sending.",
    };
  }
  const body = new URLSearchParams({
    To: input.to,
    From: input.from,
    Body: input.message,
  });
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${input.accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${input.accountSid}:${input.authToken}`).toString("base64")}`,
      },
      body,
    },
  );
  const data = (await response.json().catch(() => null)) as {
    message?: string;
  } | null;
  if (!response.ok) {
    return {
      ok: false,
      formError: data?.message || `Twilio send failed (${response.status}).`,
    };
  }
  return { ok: true };
}

async function sendViaMessageBird(input: {
  to: string;
  message: string;
  accessKey?: string;
  originator: string;
}): Promise<SendSmsResult> {
  if (!input.accessKey) {
    return {
      ok: false,
      formError: "MessageBird needs SMS_API_SECRET (Access key).",
    };
  }
  const response = await fetch("https://rest.messagebird.com/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `AccessKey ${input.accessKey}`,
    },
    body: JSON.stringify({
      originator: input.originator || "TechnoHouse",
      recipients: [input.to],
      body: input.message,
    }),
  });
  const data = (await response.json().catch(() => null)) as {
    errors?: { description?: string }[];
  } | null;
  if (!response.ok) {
    return {
      ok: false,
      formError:
        data?.errors?.[0]?.description || `MessageBird send failed (${response.status}).`,
    };
  }
  return { ok: true };
}

export async function sendSms(input: {
  to: string;
  message: string;
}): Promise<SendSmsResult> {
  const to = digitsOnly(input.to);
  if (to.length < 7) {
    return { ok: false, formError: "Enter a valid phone number." };
  }

  const config = await getAdminOtpConfig();
  const apiKey = process.env.SMS_API_KEY?.trim();
  const apiSecret = process.env.SMS_API_SECRET?.trim();

  switch (config.provider) {
    case "local-mock":
      return {
        ok: false,
        formError: "Local mock is selected — choose a real provider to send.",
      };
    case "ssl-wireless":
      return sendViaSslWireless({
        to,
        message: input.message,
        sid: apiKey,
        token: apiSecret,
      });
    case "mim-sms":
      return sendViaMimSms({
        to,
        message: input.message,
        username: apiKey,
        apiKey: apiSecret,
        senderId: config.senderId,
      });
    case "twilio":
      return sendViaTwilio({
        to,
        message: input.message,
        accountSid: apiKey,
        authToken: apiSecret,
        from: config.senderId,
      });
    case "messagebird":
      return sendViaMessageBird({
        to,
        message: input.message,
        accessKey: apiSecret,
        originator: config.senderId,
      });
    default:
      return { ok: false, formError: "Unsupported SMS provider." };
  }
}
