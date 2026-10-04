import type { BuilderSlot } from "@/lib/data/types/catalog";

/**
 * Controlled vocabulary for PC Builder compatibility attributes (AD-276,
 * multi-value since AD-346).
 *
 * Compatibility matching (lib/domain/pc-builder/compatibility.ts) compares
 * values case-insensitively, but a shared spelling still keeps the admin UI
 * and stored data tidy. These lists are a UI nudge, not a hard server-side
 * allowlist: the admin form always keeps an "Other" box that accepts free
 * text, since a real socket/interface not on this list must still be
 * enterable.
 */
export const SOCKET_OPTIONS = [
  "AM5",
  "AM4",
  "LGA1851",
  "LGA1700",
  "LGA1200",
  "LGA1151",
] as const;

export const RAM_TYPE_OPTIONS = ["DDR5", "DDR4", "DDR3"] as const;

export const FORM_FACTOR_OPTIONS = [
  "E-ATX",
  "ATX",
  "Micro-ATX",
  "Mini-ITX",
] as const;

export const STORAGE_INTERFACE_OPTIONS = ["NVMe", "SATA"] as const;

/** The compatibility fields a product can carry (mirrors `BuilderAttrs`). */
export type BuilderAttrField =
  | "socket"
  | "ramType"
  | "formFactor"
  | "storageInterface"
  | "tdpWatts";

/**
 * Which fields actually matter for each slot — exactly the fields the rule
 * evaluators in compatibility.ts read for that slot. The admin form shows
 * only these, so a RAM stick isn't offered a "Socket" box that nothing will
 * ever check. Slots absent here (monitor, keyboard, …) have no fit rules.
 */
export const SLOT_ATTRIBUTE_FIELDS: Partial<
  Record<BuilderSlot, readonly BuilderAttrField[]>
> = {
  cpu: ["socket", "tdpWatts"],
  cpu_cooler: ["socket"],
  motherboard: ["socket", "ramType", "formFactor", "storageInterface"],
  ram: ["ramType"],
  gpu: ["tdpWatts"],
  ssd: ["storageInterface"],
  hdd: ["storageInterface"],
  psu: ["tdpWatts"],
  case: ["formFactor"],
};

/**
 * What a part needs before every PC Builder check can use it ("ready").
 * Core fit data per slot, plus wattage for the slots the PSU estimate reads.
 * The motherboard's drive interface is optional on purpose: a drive missing
 * its interface is hidden from the picker, but a board missing it is not.
 */
export const SLOT_REQUIRED_FIELDS: Partial<
  Record<BuilderSlot, readonly BuilderAttrField[]>
> = {
  cpu: ["socket", "tdpWatts"],
  cpu_cooler: ["socket"],
  motherboard: ["socket", "ramType", "formFactor"],
  ram: ["ramType"],
  gpu: ["tdpWatts"],
  ssd: ["storageInterface"],
  hdd: ["storageInterface"],
  psu: ["tdpWatts"],
  case: ["formFactor"],
};

/** Controlled vocabulary for each multi-value text field. */
export const BUILDER_ATTR_VOCAB: Record<
  Exclude<BuilderAttrField, "tdpWatts">,
  readonly string[]
> = {
  socket: SOCKET_OPTIONS,
  ramType: RAM_TYPE_OPTIONS,
  formFactor: FORM_FACTOR_OPTIONS,
  storageInterface: STORAGE_INTERFACE_OPTIONS,
};

type AttributeCopy = { label: string; hint?: string };

const DEFAULT_COPY: Record<BuilderAttrField, AttributeCopy> = {
  socket: { label: "Socket" },
  ramType: { label: "RAM type" },
  formFactor: { label: "Form factor" },
  storageInterface: { label: "Storage interface" },
  tdpWatts: { label: "TDP / wattage (W)" },
};

const SLOT_COPY: Partial<
  Record<BuilderSlot, Partial<Record<BuilderAttrField, AttributeCopy>>>
> = {
  cpu: {
    socket: { label: "CPU socket", hint: "The socket this processor fits." },
    tdpWatts: { label: "CPU TDP (W)", hint: "Used to estimate PSU headroom." },
  },
  cpu_cooler: {
    socket: {
      label: "Supported sockets",
      hint: "Tick every socket this cooler can mount on.",
    },
  },
  motherboard: {
    socket: { label: "CPU socket" },
    ramType: {
      label: "Supported RAM type(s)",
      hint: "Tick both DDR4 and DDR5 for a board that accepts either.",
    },
    formFactor: { label: "Board form factor" },
    storageInterface: {
      label: "Supported drive interface(s)",
      hint: "Most boards support both NVMe and SATA — tick all that apply.",
    },
  },
  ram: {
    ramType: { label: "RAM type" },
  },
  gpu: {
    tdpWatts: {
      label: "GPU power draw (W)",
      hint: "Used to estimate PSU headroom.",
    },
  },
  ssd: {
    storageInterface: { label: "Drive interface" },
  },
  hdd: {
    storageInterface: { label: "Drive interface" },
  },
  psu: {
    tdpWatts: { label: "PSU wattage (W)", hint: "Rated output in watts." },
  },
  case: {
    formFactor: {
      label: "Supported board sizes",
      hint: "Tick every motherboard size this case holds (an ATX case usually also holds Micro-ATX and Mini-ITX).",
    },
  },
};

export function builderAttributeCopy(
  slot: BuilderSlot,
  field: BuilderAttrField,
): AttributeCopy {
  return SLOT_COPY[slot]?.[field] ?? DEFAULT_COPY[field];
}
