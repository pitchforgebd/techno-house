import type { Metadata } from "next";
import type { ReactNode } from "react";
import { submitComplaint } from "@/app/(storefront)/complaint/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getCustomerSession } from "@/lib/auth/customer-session";
import {
  COMPLAINT_MESSAGE_MAX,
  COMPLAINT_NAME_MAX,
  COMPLAINT_EMAIL_MAX,
  COMPLAINT_PHONE_MAX,
} from "@/lib/support/create-complaint";

export const metadata: Metadata = {
  title: "Complaint — Techno House",
};

/**
 * Local to this page: the shared `Field` renders its hint *below* the control,
 * while this form's design calls for the description between label and input.
 * Kept here rather than reshaping `Field`, which every other form depends on.
 */
function ComplaintField({
  htmlFor,
  label,
  description,
  required,
  error,
  children,
}: {
  htmlFor: string;
  label: string;
  description: ReactNode;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-body font-bold tracking-tight text-text"
      >
        {label}
        {required ? (
          <span className="text-danger" aria-hidden>
            *
          </span>
        ) : null}
      </label>
      <div
        id={`${htmlFor}-hint`}
        className="mt-1 space-y-0.5 text-caption leading-relaxed text-text-muted"
      >
        {description}
      </div>
      <div className="mt-2.5">{children}</div>
      {error ? (
        <p
          id={`${htmlFor}-error`}
          className="mt-1.5 text-caption font-medium text-danger"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default async function ComplaintPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; status?: string }>;
}) {
  const params = await searchParams;
  const session = await getCustomerSession();
  const nameError = params.error === "name";
  const emailError = params.error === "email";
  const messageError = params.error === "message";
  const saveError = params.error === "save";
  const sent = params.status === "sent";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-md">
        <header className="bg-danger px-6 py-8 text-center sm:px-10">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Complaint / অভিযোগ
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-label leading-relaxed text-white/90">
            We value your feedback and are committed to resolving your concerns.
            Please fill out the form below.
          </p>
          <p className="mx-auto mt-1 max-w-xl text-label leading-relaxed text-white/90">
            আমরা আপনার মতামতকে মূল্য দিই এবং আপনার উদ্বেগসমূহ সমাধানে
            প্রতিশ্রুতিবদ্ধ। অনুগ্রহ করে নিচের ফর্মটি পূরণ করুন।
          </p>
        </header>

        {sent || saveError ? (
          <div className="border-b border-border bg-surface px-6 py-5 sm:px-10">
            {sent ? (
              <Alert tone="success" title="Complaint submitted">
                Thanks — your complaint was saved and our team will review it.
                ধন্যবাদ, আপনার অভিযোগটি জমা হয়েছে।
              </Alert>
            ) : null}
            {saveError ? (
              <Alert tone="danger" title="Could not save complaint">
                Please try again in a moment.
              </Alert>
            ) : null}
          </div>
        ) : null}

        <form action={submitComplaint}>
          <div className="space-y-7 bg-primary-soft/40 px-6 py-8 sm:px-10">
            <ComplaintField
              htmlFor="message"
              label="Details of the Complaint / অভিযোগের বিবরণ"
              required
              error={messageError ? "Describe the problem." : undefined}
              description={
                <>
                  <p>
                    Describe the issue in detail. Please include relevant
                    information such as the date, time, purchase document, order
                    number, and specific incident.
                  </p>
                  <p>
                    অনুগ্রহ করে সমস্যাটি বিস্তারিতভাবে বর্ণনা করুন। তারিখ, সময়,
                    ক্রয় নথি, অর্ডার নম্বর এবং নির্দিষ্ট ঘটনার মতো প্রাসঙ্গিক
                    তথ্য অন্তর্ভুক্ত করুন।
                  </p>
                </>
              }
            >
              <Textarea
                id="message"
                name="message"
                required
                rows={6}
                maxLength={COMPLAINT_MESSAGE_MAX}
                aria-describedby="message-hint"
                aria-invalid={messageError || undefined}
                className="bg-surface"
              />
            </ComplaintField>

            <ComplaintField
              htmlFor="name"
              label="Name / নাম"
              required
              error={nameError ? "Enter your name." : undefined}
              description={<p>Enter your name / আপনার নাম লিখুন</p>}
            >
              <Input
                id="name"
                name="name"
                required
                maxLength={COMPLAINT_NAME_MAX}
                autoComplete="name"
                defaultValue={session?.fullName ?? ""}
                aria-describedby="name-hint"
                aria-invalid={nameError || undefined}
                className="bg-surface sm:max-w-md"
              />
            </ComplaintField>

            <ComplaintField
              htmlFor="email"
              label="Email / ইমেইল"
              required
              error={emailError ? "Enter a valid email address." : undefined}
              description={
                <p>Enter your email address / আপনার ইমেইল ঠিকানা লিখুন</p>
              }
            >
              <Input
                id="email"
                name="email"
                type="email"
                required
                maxLength={COMPLAINT_EMAIL_MAX}
                autoComplete="email"
                defaultValue={session?.email ?? ""}
                aria-describedby="email-hint"
                aria-invalid={emailError || undefined}
                className="bg-surface sm:max-w-md"
              />
            </ComplaintField>

            <ComplaintField
              htmlFor="phone"
              label="Phone / ফোন"
              description={
                <p>
                  Optional — a number we can reach you on / ঐচ্ছিক — আপনার ফোন
                  নাম্বার
                </p>
              }
            >
              <Input
                id="phone"
                name="phone"
                type="tel"
                maxLength={COMPLAINT_PHONE_MAX}
                autoComplete="tel"
                defaultValue={session?.phone ?? ""}
                aria-describedby="phone-hint"
                className="bg-surface sm:max-w-md"
              />
            </ComplaintField>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-border bg-surface px-6 py-5 sm:px-10">
            <Button type="submit" variant="danger">
              Submit / জমা দিন
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

      <p className="mt-4 text-center text-caption text-text-muted">
        Please do not include passwords or full payment card details.
      </p>
    </div>
  );
}
