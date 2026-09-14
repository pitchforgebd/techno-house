/**
 * Controlled vocabulary for PC Builder compatibility attributes (AD-276).
 *
 * Real strict-equality matching (lib/domain/pc-builder/compatibility.ts)
 * depends on two products using the exact same string for the same socket/
 * RAM type/etc. — free text alone lets "AM5" and "am5" silently fail to
 * match. These lists are a UI nudge toward consistency, not a hard
 * server-side allowlist: the admin form always keeps an "Other" option that
 * accepts free text, since a real socket/interface not on this list must
 * still be enterable.
 */
export const SOCKET_OPTIONS = [
  "AM5",
  "AM4",
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

export const OTHER_OPTION_VALUE = "__other__";
