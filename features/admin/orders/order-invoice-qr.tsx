import { cn } from "@/lib/cn";

export function OrderInvoiceQr({
  dataUrl,
  orderNumber,
  size = "md",
  className,
}: {
  dataUrl: string;
  orderNumber: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dim = size === "sm" ? 96 : size === "lg" ? 168 : 128;

  return (
    <figure
      className={cn(
        "inline-flex flex-col items-start gap-1.5",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- data URL QR for print */}
      <img
        src={dataUrl}
        alt={`Invoice QR for order ${orderNumber}`}
        width={dim}
        height={dim}
        className="rounded border border-neutral-200 bg-white p-1"
      />
      <figcaption className="max-w-[10rem] text-[0.65rem] leading-snug text-neutral-500">
        Scan for order, products & shop details · {orderNumber}
      </figcaption>
    </figure>
  );
}
