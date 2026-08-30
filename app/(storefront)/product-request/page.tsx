import type { Metadata } from "next";
import { submitProductRequest } from "@/app/(storefront)/product-request/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  const nameError = params.error === "name";
  const notSaved = params.status === "not-saved";

  return (
    <div className="mx-auto max-w-content px-4 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">
        Request a product
      </h1>
      <p className="mt-2 max-w-prose text-body text-text-muted">
        Tell us what you are looking for. Submissions are checked on the server
        and are not stored yet.
      </p>
      {nameError ? (
        <Alert className="mt-6" tone="danger" title="Product name is required">
          Enter a product name of up to {PRODUCT_REQUEST_NAME_MAX} characters.
        </Alert>
      ) : null}
      {notSaved ? (
        <Alert className="mt-6" tone="info" title="Request not saved">
          The form was accepted for this preview, but nothing was stored or
          emailed. Product requests will be saved when storage is ready.
        </Alert>
      ) : null}
      <form action={submitProductRequest} className="mt-6 max-w-md space-y-4">
        <Field
          label="Product name"
          htmlFor="productName"
          error={nameError ? "Enter a product name." : undefined}
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
