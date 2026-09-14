import type { ReactNode } from "react";
import { LifeBuoy, Mail, Phone, ShieldCheck } from "lucide-react";
import { submitSupportRequest } from "@/app/(storefront)/support/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  COMPLAINT_EMAIL_MAX,
  COMPLAINT_MESSAGE_MAX,
  COMPLAINT_NAME_MAX,
  COMPLAINT_PHONE_MAX,
  COMPLAINT_SUBJECT_MAX,
} from "@/lib/support/create-complaint";

const ERRORS: Record<string, string> = {
  name: "Enter your name so we know who to reply to.",
  email: "Enter a valid email address — that is where the reply goes.",
  message: "Describe the problem so support has something to work with.",
  save: "Could not send that just now. Please try again in a moment.",
};

const BEFORE_YOU_WRITE = [
  {
    Icon: LifeBuoy,
    title: "Have your order number ready",
    text: "It is on your confirmation email and in your account order list.",
  },
  {
    Icon: Phone,
    title: "Support hours are 9:00–22:00",
    text: "Messages sent outside those hours are answered the next morning.",
  },
  {
    Icon: Mail,
    title: "Replies go to your email",
    text: "Check the address you enter is one you actually read.",
  },
] as const;

function SupportField({
  htmlFor,
  label,
  hint,
  required,
  children,
}: {
  htmlFor: string;
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-label font-semibold tracking-tight text-text"
      >
        {label}
        {required ? (
          <span className="text-danger" aria-hidden>
            {" *"}
          </span>
        ) : null}
      </label>
      {hint ? (
        <p className="mt-0.5 text-caption leading-relaxed text-text-muted">
          {hint}
        </p>
      ) : null}
      <div className="mt-2">{children}</div>
    </div>
  );
}

/**
 * Support-hub contact form.
 *
 * Posts through the same `createComplaint` pipeline the footer Complaint Box
 * uses, so it lands in Admin → Contacts and fires the existing staff alert —
 * no second inbox to build or remember to watch. Tagged `source: "SUPPORT"`
 * so staff can tell a support question from a footer complaint in the list.
 *
 * A plain server action with no client JavaScript: this is the page people
 * reach when something is already broken, so it should not itself depend on
 * scripting to submit.
 */
export function SupportRequestForm({
  status,
  error,
  defaultName,
  defaultEmail,
}: {
  status?: string;
  error?: string;
  /** Prefilled for signed-in customers so they retype less. */
  defaultName?: string;
  defaultEmail?: string;
}) {
  const errorMessage = error ? (ERRORS[error] ?? ERRORS.save) : null;

  return (
    <section
      id="support-form"
      aria-labelledby="support-form-heading"
      className="mt-12 scroll-mt-24 border-t border-border pt-10"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)] lg:gap-8">
        <div className="min-w-0 rounded-lg border border-border bg-surface p-5 shadow-[0_20px_50px_-40px_rgb(14_26_36/0.45)] sm:p-7">
          <h2
            id="support-form-heading"
            className="text-xl font-semibold tracking-tight text-text sm:text-2xl"
          >
            Send the support desk a message
          </h2>
          <p className="mt-1.5 max-w-prose text-label leading-relaxed text-text-muted">
            Order problems, warranty questions, delivery follow-ups — anything
            the guidance above did not answer. It reaches the same desk that
            handles complaints.
          </p>

          {status === "sent" ? (
            <Alert tone="success" title="Message sent" className="mt-5">
              <p className="text-caption">
                Support has your message and will reply to the email address you
                gave. Check your spam folder if nothing arrives.
              </p>
            </Alert>
          ) : null}

          {errorMessage ? (
            <Alert tone="danger" title="Could not send" className="mt-5">
              <p className="text-caption">{errorMessage}</p>
            </Alert>
          ) : null}

          <form action={submitSupportRequest} className="mt-6 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <SupportField htmlFor="support-name" label="Your name" required>
                <Input
                  id="support-name"
                  name="name"
                  required
                  autoComplete="name"
                  maxLength={COMPLAINT_NAME_MAX}
                  defaultValue={defaultName}
                />
              </SupportField>

              <SupportField htmlFor="support-email" label="Email" required>
                <Input
                  id="support-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  maxLength={COMPLAINT_EMAIL_MAX}
                  defaultValue={defaultEmail}
                />
              </SupportField>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <SupportField
                htmlFor="support-phone"
                label="Phone"
                hint="Optional — faster for delivery and warranty questions."
              >
                <Input
                  id="support-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="01XXXXXXXXX"
                  maxLength={COMPLAINT_PHONE_MAX}
                />
              </SupportField>

              <SupportField
                htmlFor="support-subject"
                label="Subject"
                hint="Optional — one is derived from your message otherwise."
              >
                <Input
                  id="support-subject"
                  name="subject"
                  maxLength={COMPLAINT_SUBJECT_MAX}
                  placeholder="Order not delivered"
                />
              </SupportField>
            </div>

            <SupportField
              htmlFor="support-message"
              label="How can we help?"
              hint="Include the order number and what went wrong — it saves a round trip."
              required
            >
              <Textarea
                id="support-message"
                name="message"
                required
                rows={6}
                maxLength={COMPLAINT_MESSAGE_MAX}
              />
            </SupportField>

            <div className="flex flex-wrap items-center gap-3 border-t border-border/70 pt-5">
              <Button type="submit" className="min-w-44">
                Send to support
              </Button>
              <Button
                type="reset"
                variant="ghost"
                className="border border-border"
              >
                Clear form
              </Button>
            </div>
          </form>
        </div>

        <aside className="min-w-0 rounded-lg border border-border bg-surface-muted/60 p-5 sm:p-6">
          <h3 className="text-label font-semibold tracking-tight text-text">
            Before you write
          </h3>

          <ul className="mt-4 grid gap-4">
            {BEFORE_YOU_WRITE.map(({ Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-sm bg-primary-soft text-primary">
                  <Icon aria-hidden strokeWidth={1.75} className="size-4.5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-label font-semibold text-text">
                    {title}
                  </span>
                  <span className="mt-0.5 block text-caption leading-relaxed text-text-muted">
                    {text}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-6 flex items-start gap-2 border-t border-border pt-5 text-caption leading-relaxed text-text-muted">
            <ShieldCheck
              aria-hidden
              strokeWidth={1.75}
              className="mt-0.5 size-4 shrink-0 text-primary"
            />
            Never put your password, full card number, or an OTP in a support
            message. Staff will never ask for them.
          </p>
        </aside>
      </div>
    </section>
  );
}
