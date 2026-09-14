"use client";

type AdminToggleSwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  /** Classes when checked (default brand blue). */
  activeClassName?: string;
  disabled?: boolean;
};

export function AdminToggleSwitch({
  checked,
  onChange,
  label,
  activeClassName = "bg-[#3897f0]",
  disabled = false,
}: AdminToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? activeClassName : "bg-neutral-300"
      }`}
    >
      <span
        className={`pointer-events-none inline-block size-5 translate-y-0.5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-[1.35rem]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export function AdminToggleRow({
  label,
  checked,
  onChange,
  disabled,
}: AdminToggleSwitchProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <span className="text-sm text-neutral-700">{label}</span>
      <AdminToggleSwitch
        label={label}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}
