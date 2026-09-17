import Image from "next/image";

export function AdminWarrantyBadge({
  badge,
  label,
  logoSrc,
}: {
  badge: string;
  label: string;
  logoSrc?: string | null;
}) {
  if (logoSrc) {
    return (
      <span
        title={label}
        className="inline-flex size-12 items-center justify-center overflow-hidden rounded-full border-2 border-amber-500 bg-neutral-900 shadow-sm"
      >
        <Image
          src={logoSrc}
          alt={label}
          width={40}
          height={40}
          className="size-10 rounded-full object-cover"
        />
      </span>
    );
  }

  return (
    <span
      title={label}
      className="inline-flex size-12 items-center justify-center rounded-full border-2 border-amber-500 bg-neutral-900 text-[0.65rem] font-bold tracking-wide text-amber-400 shadow-sm"
    >
      {badge}
    </span>
  );
}
