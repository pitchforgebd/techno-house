import type {
  BuilderAttrs,
  BuilderCandidate,
  BuilderSlot,
} from "@/lib/data/types/catalog";
import {
  isRuleTypeEnabled,
  PC_RULE_TYPES,
  type PcBuilderRuleType,
} from "@/lib/domain/pc-builder/rules";
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

export type RuleEvaluation = {
  warnings: CompatibilityWarning[];
  checkedOk: number;
};

export type RuleEvaluator = (parts: CompatibilityPart[]) => RuleEvaluation;

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

function evaluateSocket(parts: CompatibilityPart[]): RuleEvaluation {
  const warnings: CompatibilityWarning[] = [];
  let checkedOk = 0;
  const cpu = partBySlot(parts, "cpu");
  const cooler = partBySlot(parts, "cpu_cooler");
  const motherboard = partBySlot(parts, "motherboard");

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

  return { warnings, checkedOk };
}

function evaluateRamType(parts: CompatibilityPart[]): RuleEvaluation {
  const warnings: CompatibilityWarning[] = [];
  let checkedOk = 0;
  const ram = partBySlot(parts, "ram");
  const motherboard = partBySlot(parts, "motherboard");
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
  return { warnings, checkedOk };
}

function evaluateFormFactor(parts: CompatibilityPart[]): RuleEvaluation {
  const warnings: CompatibilityWarning[] = [];
  let checkedOk = 0;
  const motherboard = partBySlot(parts, "motherboard");
  const casePart = partBySlot(parts, "case");
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
  return { warnings, checkedOk };
}

function evaluatePsuWattage(parts: CompatibilityPart[]): RuleEvaluation {
  const warnings: CompatibilityWarning[] = [];
  let checkedOk = 0;
  const cpu = partBySlot(parts, "cpu");
  const gpu = partBySlot(parts, "gpu");
  const psu = partBySlot(parts, "psu");
  if (!psu || (!cpu && !gpu)) {
    return { warnings, checkedOk };
  }

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

  return { warnings, checkedOk };
}

/**
 * SSD/HDD versus motherboard interface. Missing `storageInterface` on either
 * side is `unknown` — never a false compatible claim. No GPU-clearance or
 * invented connector data.
 */
function evaluateStorageInterface(parts: CompatibilityPart[]): RuleEvaluation {
  const warnings: CompatibilityWarning[] = [];
  let checkedOk = 0;
  const motherboard = partBySlot(parts, "motherboard");
  if (!motherboard) {
    return { warnings, checkedOk };
  }

  const drives = (["ssd", "hdd"] as const)
    .map((slot) => partBySlot(parts, slot))
    .filter((part): part is CompatibilityPart => part != null);

  for (const drive of drives) {
    if (
      compareEqualField({
        left: drive,
        right: motherboard,
        field: "storageInterface",
        code: `${drive.slotId}_mb_storage`,
        label: `${drive.slotId === "ssd" ? "SSD" : "HDD"} / motherboard storage interface`,
        warnings,
      }) === "ok"
    ) {
      checkedOk += 1;
    }
  }

  return { warnings, checkedOk };
}

/** One evaluator per persisted `PcBuilderRuleType`. */
export const RULE_EVALUATORS: Record<PcBuilderRuleType, RuleEvaluator> = {
  socket: evaluateSocket,
  ram_type: evaluateRamType,
  psu_wattage: evaluatePsuWattage,
  form_factor: evaluateFormFactor,
  storage_interface: evaluateStorageInterface,
};

/**
 * Pure compatibility evaluation. Walks the rule-type table; disabled types
 * are skipped. Missing required attributes → `unknown`, never a false
 * “compatible” claim. Omit `enabledTypes` to run every implemented type.
 */
export function evaluateCompatibility(
  parts: CompatibilityPart[],
  enabledTypes?: Iterable<PcBuilderRuleType>,
): CompatibilityResult {
  const warnings: CompatibilityWarning[] = [];
  let checkedOk = 0;
  const enabled =
    enabledTypes === undefined ? undefined : new Set(enabledTypes);

  for (const type of PC_RULE_TYPES) {
    if (!isRuleTypeEnabled(enabled, type)) {
      continue;
    }
    const result = RULE_EVALUATORS[type](parts);
    warnings.push(...result.warnings);
    checkedOk += result.checkedOk;
  }

  return {
    warnings,
    checkedOk,
    hasIncompatible: warnings.some(
      (warning) => warning.status === "incompatible",
    ),
    hasUnknown: warnings.some((warning) => warning.status === "unknown"),
  };
}

export type CandidateCompatibilityStatus = "ok" | "unknown" | "incompatible";

export type CandidateCompatibility = {
  candidate: BuilderCandidate;
  status: CandidateCompatibilityStatus;
  /** Only the warnings this candidate itself is party to — not the whole build's warnings. */
  warnings: CompatibilityWarning[];
};

/**
 * Suggests-as-you-pick (AD-276): for a slot the customer is currently
 * choosing, scores every candidate against the parts already selected in
 * the rest of the build — by momentarily adding it to the same real
 * `evaluateCompatibility` engine used everywhere else, not a separate
 * comparison. A candidate is "incompatible" only when a check involving
 * this slot definitely disagrees (both sides had data); "unknown" when a
 * check involving this slot couldn't be verified (data missing on either
 * side); "ok" otherwise — including when nothing else is selected yet.
 * Pre-existing mismatches among *other*, already-selected slots never
 * hide a candidate here (e.g. a wrong CPU/cooler pairing shouldn't blank
 * out every motherboard).
 */
export function rankCandidatesForSlot(input: {
  slot: BuilderSlot;
  candidates: BuilderCandidate[];
  selectedParts: CompatibilityPart[];
  enabledTypes?: Iterable<PcBuilderRuleType>;
}): CandidateCompatibility[] {
  const otherParts = input.selectedParts.filter(
    (part) => part.slotId !== input.slot,
  );

  return input.candidates.map((candidate) => {
    const hypothetical: CompatibilityPart[] = [
      ...otherParts,
      {
        slotId: input.slot,
        slug: candidate.slug,
        name: candidate.name,
        attrs: candidate.builderAttrs,
      },
    ];
    const result = evaluateCompatibility(hypothetical, input.enabledTypes);
    const relevant = result.warnings.filter((warning) =>
      warning.slotIds?.includes(input.slot),
    );
    const status: CandidateCompatibilityStatus = relevant.some(
      (warning) => warning.status === "incompatible",
    )
      ? "incompatible"
      : relevant.some((warning) => warning.status === "unknown")
        ? "unknown"
        : "ok";

    return { candidate, status, warnings: relevant };
  });
}
