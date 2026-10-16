import { NextResponse } from "next/server";
import { getAdminBusinessSettings } from "@/lib/business/config";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { loginHref } from "@/lib/account/return-path";
import { BUILDER_SLOTS } from "@/lib/domain/pc-builder";
import { renderInvoicePdf } from "@/lib/orders/invoice-pdf";
import {
  renderBuildQuoteHtml,
  type BuildQuoteLine,
} from "@/lib/pc-builder/build-quote-html";
import { getPublicSharedBuild } from "@/lib/pc-builder/share";
import { validateBuild } from "@/lib/pc-builder/validate-build";
import { publicOrigin } from "@/lib/seo/public-origin";

type RouteParams = { params: Promise<{ id: string }> };

/** Downloadable quote PDF for a shared build — same lookup as the share
 * page itself (`/pc-builder/share/[id]`), just rendered to PDF instead
 * of HTML.
 *
 * `?inline=1` serves it for display instead of download, which is what the
 * Print buttons open: printing this quote gives a clean parts list, where
 * printing the builder page itself would carry the site header and footer.
 * Viewing/printing inline stays open to anyone with the link, same as the
 * share page itself — but an actual file download requires sign-in (AD-379:
 * "share, save, download" all need an account), same gate saving/sharing a
 * build already use (`BUILDS_SIGN_IN` in lib/pc-builder/saved-builds.ts). */
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const url = new URL(request.url);
  const inline = url.searchParams.get("inline") === "1";

  if (!inline) {
    const session = await getCustomerSession();
    if (!session) {
      return NextResponse.redirect(
        `${publicOrigin()}${loginHref(`/pc-builder/share/${id}`)}`,
      );
    }
  }

  const shared = await getPublicSharedBuild(id);
  if (!shared) {
    return NextResponse.json(
      { error: "This share link could not be found." },
      { status: 404 },
    );
  }

  const snapshot = await validateBuild(shared.selection);
  const productsBySlug = new Map(
    snapshot.products.map((product) => [product.slug, product]),
  );

  const lines: BuildQuoteLine[] = [];
  for (const slot of BUILDER_SLOTS) {
    const slug = shared.selection[slot.id];
    if (typeof slug !== "string" || !slug) {
      continue;
    }
    const product = productsBySlug.get(slug);
    if (!product) {
      continue;
    }
    lines.push({
      slotLabel: slot.label,
      productName: product.name,
      sku: product.sku,
      unitAmount: product.price.amount,
    });
  }

  if (lines.length === 0) {
    return NextResponse.json(
      { error: "This build has no priced parts to quote." },
      { status: 404 },
    );
  }

  const business = await getAdminBusinessSettings();
  const html = renderBuildQuoteHtml({
    buildName: shared.name.trim() || "PC Builder quote",
    generatedAt: new Date().toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
    lines,
    subtotalAmount: snapshot.pricing.subtotal,
    store: {
      storeName: business.storeName || "Techno House",
      supportEmail: business.supportEmail || "",
      phone: business.phone || "",
      address: business.address || "",
      city: business.city || "Dhaka",
      logoSrc: business.logoSrc.trim() || null,
    },
  });

  const pdf = await renderInvoicePdf(html);
  const filename = `${(shared.name.trim() || "pc-builder-quote")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}.pdf`;

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename || "pc-builder-quote.pdf"}"`,
      "Cache-Control": "no-store",
    },
  });
}
