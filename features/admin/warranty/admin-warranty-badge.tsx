export function AdminWarrantyBadge({
  badge,
  label,
}: {
  badge: string;
  label: string;
}) {
  return (
    <span
      title={label}
      className="inline-flex size-12 items-center justify-center rounded-full border-2 border-amber-500 bg-neutral-900 text-[0.65rem] font-bold tracking-wide text-amber-400 shadow-sm"
    >
      {badge}
    </span>
  );
}
