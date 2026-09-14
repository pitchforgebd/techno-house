import { FileText } from "lucide-react";
import { pdfFilenameFromSrc } from "@/lib/product/pdf-specification";
import { youtubeEmbedUrl } from "@/lib/product/youtube";

type ProductMediaExtrasProps = {
  productName: string;
  youtubeUrl: string | null;
  pdfSpecificationSrc: string | null;
};

export function ProductMediaExtras({
  productName,
  youtubeUrl,
  pdfSpecificationSrc,
}: ProductMediaExtrasProps) {
  const embed = youtubeUrl ? youtubeEmbedUrl(youtubeUrl) : null;
  const hasPdf = Boolean(pdfSpecificationSrc);

  if (!embed && !hasPdf) {
    return null;
  }

  return (
    <div className="mt-8 space-y-6">
      {embed ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight text-text">
            Product video
          </h2>
          <div className="overflow-hidden border border-border bg-surface">
            <div className="relative aspect-video w-full bg-text/95">
              <iframe
                src={embed}
                title={`${productName} video`}
                className="absolute inset-0 size-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          </div>
        </section>
      ) : null}

      {hasPdf && pdfSpecificationSrc ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight text-text">
            PDF specification
          </h2>
          <a
            href={pdfSpecificationSrc}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 border border-border bg-surface px-4 py-3 text-body text-text transition-colors hover:border-primary/40 hover:bg-surface-muted"
          >
            <span className="inline-flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <FileText className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">
                {pdfFilenameFromSrc(pdfSpecificationSrc)}
              </span>
              <span className="block text-caption text-text-muted">
                Open or download the specification sheet
              </span>
            </span>
          </a>
        </section>
      ) : null}
    </div>
  );
}
