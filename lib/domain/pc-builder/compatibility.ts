import type { BuilderAttrs, BuilderSlot } from "@/lib/data/types/catalog";
import type { CompatibilityWarning } from "@/lib/domain/pc-builder/types";

/** Snapshot of a selected part for the pure compatibility engine. */
export type CompatibilityPart = {
  slotId: BuilderSlot;
  slug: string;
  name: string;
  attrs: BuilderAttrs | null;
};

export type CompatibilityResult = {
  warnings: CompatibilityWarning[];
  checkedOk: number;
  hasIncompatible: boolean;
  hasUnknown: boolean;
};

function partBySlot(
  parts: CompatibilityPart[],
  slotId: BuilderSlot,
): CompatibilityPart | undefined {
  return parts.find((part) => part.slotId === slotId);
}

function pushWarning(
  warnings: CompatibilityWarning[],
  warning: CompatibilityWarning,
) {
  warnings.push(warning);
}

function compareEqualField(args: {
  left: CompatibilityPart;
  right: CompatibilityPart;
  field: keyof BuilderAttrs;
  code: string;
  label: string;
  warnings: CompatibilityWarning[];
}): "ok" | "issue" {
  const { left, right, field, code, label, warnings } = args;
  const leftValue = left.attrs?.[field];
  const rightValue = right.attrs?.[field];

  if (
    leftValue === undefined ||
    leftValue === null ||
    leftValue === "" ||
    rightValue === undefined ||
    rightValue === null ||
    rightValue === ""
  ) {
    pushWarning(warnings, {
      status: "unknown",
      code: `${code}_unknown`,
      message: `${label} cannot be verified — missing data on ${
        leftValue ? right.name : left.name
      }.`,
      slotIds: [left.slotId, right.slotId],
    });
    return "issue";
  }

  if (leftValue !== rightValue) {
    pushWarning(warnings, {
      status: "incompatible",
      code: `${code}_mismatch`,
      message: `${label} mismatch: ${left.name} (${String(leftValue)}) vs ${right.name} (${String(rightValue)}).`,
      slotIds: [left.slotId, right.slotId],
    });
    return "issue";
  }

  return "ok";
}

/**
 * Pure compatibility evaluation. Only rules with attribute coverage run.
 * Missing required attributes → `unknown`, never a false “compatible” claim.
 */
export function evaluateCompatibility(
  parts: CompatibilityPart[],
): CompatibilityResult {
  const warnings: CompatibilityWarning[] = [];
  let checkedOk = 0;

  const cpu = partBySlot(parts, "cpu");
  const cooler = partBySlot(parts, "cpu_cooler");
  const motherboard = partBySlot(parts, "motherboard");
  const ram = partBySlot(parts, "ram");
  const casePart = partBySlot(parts, "case");
  const gpu = partBySlot(parts, "gpu");
  const psu = partBySlot(parts, "psu");

  if (cpu && motherboard) {
    if (
      compareEqualField({
        left: cpu,
        right: motherboard,
        field: "socket",
        code: "cpu_mb_socket",
        label: "CPU / motherboard socket",
        warnings,
      }) === "ok"
    ) {
      checkedOk += 1;
    }
  }

  if (cooler && cpu) {
    if (
      compareEqualField({
        left: cooler,
        right: cpu,
        field: "socket",
        code: "cooler_cpu_socket",
        label: "Cooler / CPU socket",
        warnings,
      }) === "ok"
    ) {
      checkedOk += 1;
    }
  } else if (cooler && motherboard && !cpu) {
    if (
      compareEqualField({
        left: cooler,
        right: motherboard,
        field: "socket",
        code: "cooler_mb_socket",
        label: "Cooler / motherboard socket",
        warnings,
      }) === "ok"
    ) {
      checkedOk += 1;
    }
  }

  if (ram && motherboard) {
    if (
      compareEqualField({
        left: ram,
        right: motherboard,
        field: "ramType",
        code: "ram_mb_type",
        label: "RAM type / motherboard support",
        warnings,
      }) === "ok"
    ) {
      checkedOk += 1;
    }
  }

  if (motherboard && casePart) {
    if (
      compareEqualField({
        left: motherboard,
        right: casePart,
        field: "formFactor",
        code: "mb_case_form",
        label: "Motherboard / case form factor",
        warnings,
      }) === "ok"
    ) {
      checkedOk += 1;
    }
  }

  if (psu && (cpu || gpu)) {
    const cpuTdp = cpu?.attrs?.tdpWatts;
    const gpuTdp = gpu?.attrs?.tdpWatts;
    const psuWatts = psu.attrs?.tdpWatts;
    const drawParts: string[] = [];
    let estimatedDraw = 0;
    let drawKnown = true;

    if (cpu) {
      if (typeof cpuTdp === "number" && cpuTdp > 0) {
        estimatedDraw += cpuTdp;
        drawParts.push(`CPU ${cpuTdp}W`);
      } else {
        drawKnown = false;
      }
    }
    if (gpu) {
      if (typeof gpuTdp === "number" && gpuTdp > 0) {
        estimatedDraw += gpuTdp;
        drawParts.push(`GPU ${gpuTdp}W`);
      } else {
        drawKnown = false;
      }
    }

    if (!drawKnown || typeof psuWatts !== "number" || psuWatts <= 0) {
      pushWarning(warnings, {
        status: "unknown",
        code: "psu_capacity_unknown",
        message:
          "PSU capacity versus estimated draw cannot be verified — missing TDP or wattage data.",
        slotIds: [
          "psu",
          ...(cpu ? (["cpu"] as BuilderSlot[]) : []),
          ...(gpu ? (["gpu"] as BuilderSlot[]) : []),
        ],
      });
    } else {
      const required = Math.ceil(estimatedDraw * 1.5);
      if (psuWatts < required) {
        pushWarning(warnings, {
          status: "incompatible",
          code: "psu_capacity_low",
          message: `PSU may be undersized: ${psu.name} is ${psuWatts}W but estimated draw (${drawParts.join(
            " + ",
          )}) suggests ~${required}W with headroom.`,
          slotIds: [
            "psu",
            ...(cpu ? (["cpu"] as BuilderSlot[]) : []),
            ...(gpu ? (["gpu"] as BuilderSlot[]) : []),
          ],
        });
      } else {
        checkedOk += 1;
      }
    }
  }

  const hasIncompatible = warnings.some((w) => w.status === "incompatible");
  const hasUnknown = warnings.some((w) => w.status === "unknown");

  return {
    warnings,
    checkedOk,
    hasIncompatible,
    hasUnknown,
  };
}
