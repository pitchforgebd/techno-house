import type { Metadata } from "next";
import { submitProductRequest } from "@/app/(storefront)/product-request/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getCustomerSession } from "@/lib/auth/customer-session";
import {
  PRODUCT_REQUEST_CUSTOMER_NAME_MAX,
  PRODUCT_REQUEST_EMAIL_MAX,
  PRODUCT_REQUEST_PHONE_MAX,
} from "@/lib/support/create-product-request";
import {
  PRODUCT_REQUEST_DETAILS_MAX,
  PRODUCT_REQUEST_NAME_MAX,
} from "@/lib/support/product-request";

export const metadata: Metadata = {
  title: "Request a product — Techno House",
};

export default async function ProductRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; status?: string }>;
}) {
  const params = await searchParams;
  const session = await getCustomerSession();
  const nameError = params.error === "name";
  const emailError = params.error === "email";
  const productError = params.error === "product";
  const saveError = params.error === "save";
  const sent = params.status === "sent";

  return (
    <div className="mx-auto max-w-content px-4 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">
        Request a product
      </h1>
      <p className="mt-2 max-w-prose text-body text-text-muted">
        Tell us what you are looking for. Your request is saved for the Techno
        House team to review in Admin → Product requests.
      </p>
      {nameError ? (
        <Alert className="mt-6" tone="danger" title="Name is required">
          Enter your name so we can follow up.
        </Alert>
      ) : null}
      {emailError ? (
        <Alert className="mt-6" tone="danger" title="Email is required">
          Enter a valid email address.
        </Alert>
      ) : null}
      {productError ? (
        <Alert className="mt-6" tone="danger" title="Product name is required">
          Enter a product name of up to {PRODUCT_REQUEST_NAME_MAX} characters.
        </Alert>
      ) : null}
      {saveError ? (
        <Alert className="mt-6" tone="danger" title="Could not save request">
          Please try again in a moment.
        </Alert>
      ) : null}
      {sent ? (
        <Alert className="mt-6" tone="success" title="Request submitted">
          Thanks — your product request was saved. Our team will review it
          shortly.
        </Alert>
      ) : null}
      <form action={submitProductRequest} className="mt-6 max-w-md space-y-4">
        <Field
          label="Your name"
          htmlFor="customerName"
          error={nameError ? "Enter your name." : undefined}
        >
          <Input
            id="customerName"
            name="customerName"
            required
            maxLength={PRODUCT_REQUEST_CUSTOMER_NAME_MAX}
            autoComplete="name"
            defaultValue={session?.fullName ?? ""}
          />
        </Field>
        <Field
          label="Email"
          htmlFor="customerEmail"
          error={emailError ? "Enter a valid email." : undefined}
        >
          <Input
            id="customerEmail"
            name="customerEmail"
            type="email"
            required
            maxLength={PRODUCT_REQUEST_EMAIL_MAX}
            autoComplete="email"
            defaultValue={session?.email ?? ""}
          />
        </Field>
        <Field label="Phone" htmlFor="customerPhone" hint="Optional">
          <Input
            id="customerPhone"
            name="customerPhone"
            type="tel"
            maxLength={PRODUCT_REQUEST_PHONE_MAX}
            autoComplete="tel"
            defaultValue={session?.phone ?? ""}
          />
        </Field>
        <Field
          label="Product name"
          htmlFor="productName"
          error={productError ? "Enter a product name." : undefined}
        >
          <Input
            id="productName"
            name="productName"
            required
            maxLength={PRODUCT_REQUEST_NAME_MAX}
            autoComplete="off"
          />
        </Field>
        <Field
          label="Details"
          htmlFor="details"
          hint="Optional. Do not include passwords or payment details."
        >
          <Textarea
            id="details"
            name="details"
            maxLength={PRODUCT_REQUEST_DETAILS_MAX}
          />
        </Field>
        <Button type="submit">Submit request</Button>
      </form>
    </div>
  );
}
