/**
 * Command-line options of scripts/seo/apply-product-seo.mjs (SEO phase 8, v2.3). PURE: no process, no fs.
 *
 * The old reader looked for `--name` / `--name=value` and treated everything it did not understand as "not
 * given": `--limit 20` (a space) was silently ignored, `--limit=abc` or a bare `--limit` too, and a typo such as
 * `--limt=20` simply vanished. For a tool that writes to a database, "ignored" is the dangerous answer, so:
 *
 *  - `--name=value` and `--name value` both work;
 *  - a missing or non-numeric value aborts, an unknown option aborts, a repeated option aborts;
 *  - a numeric option takes whole numbers only ("20", not "20x", "2.5", "-3", "1e3");
 *  - impossible combinations abort (a read-only report cannot be combined with --apply).
 */
import { DEFAULT_MIN_SPECS } from "@/lib/seo/product-seo-apply";

export class ArgError extends Error {}

/** What an option takes: nothing, a required value, or an optional whole number (`--select-batch[=N]`). */
const OPTIONS: Record<string, "flag" | "value" | "number?"> = {
  apply: "flag",
  overwrite: "flag",
  "apply-alts": "flag",
  force: "flag",
  "allow-few-specs": "flag",
  "explain-filter": "flag",
  restore: "value",
  "confirm-db": "value",
  "batch-file": "value",
  limit: "value",
  out: "value",
  "min-specs": "value",
  "select-batch": "number?",
};

export const MAX_MIN_SPECS = 4;
export const DEFAULT_SELECT_COUNT = 500;

export type ApplyArgs = {
  apply: boolean;
  restore: string | null;
  confirmDb: string | null;
  batchFile: string | null;
  /** At most this many products (after the batch filter); null = no limit. */
  limit: number | null;
  select: boolean;
  selectCount: number;
  explainFilter: boolean;
  overwrite: boolean;
  applyAlts: boolean;
  force: boolean;
  allowFewSpecs: boolean;
  /** The minimum number of specs a description must state, and where that number came from. */
  minSpecs: number;
  minSpecsSource: string;
  /** Report / backup folder, or (with --select-batch) the batch CSV to write. */
  outDir: string | null;
  outFile: string | null;
};

function wholeNumber(name: string, raw: string, min: number, max = Number.MAX_SAFE_INTEGER): number {
  const text = raw.trim();
  if (!/^\d+$/.test(text)) throw new ArgError(`--${name} must be a whole number (got "${raw}").`);
  const n = Number(text);
  if (!Number.isSafeInteger(n) || n < min || n > max) {
    throw new ArgError(`--${name} must be a whole number from ${min}${max === Number.MAX_SAFE_INTEGER ? " up" : ` to ${max}`} (got "${raw}").`);
  }
  return n;
}

/** Throws ArgError (a message fit to print) for anything it cannot be sure about. */
export function parseApplyArgs(argv: string[]): ApplyArgs {
  const given = new Map<string, string | true>();
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i] ?? "";
    if (!token.startsWith("--")) {
      throw new ArgError(`Unexpected argument "${token}". Options are written --name=value or --name value.`);
    }
    const eq = token.indexOf("=");
    const name = eq === -1 ? token.slice(2) : token.slice(2, eq);
    const inline = eq === -1 ? undefined : token.slice(eq + 1);
    const kind = OPTIONS[name];
    if (!kind) throw new ArgError(`Unknown option --${name}.`);
    if (given.has(name)) throw new ArgError(`--${name} was given twice.`);
    if (kind === "flag") {
      if (inline !== undefined) throw new ArgError(`--${name} takes no value (got "${inline}").`);
      given.set(name, true);
      continue;
    }
    let value = inline;
    if (value === undefined) {
      const next = argv[i + 1];
      if (kind === "value" && next !== undefined && !next.startsWith("--")) {
        value = next;
        i += 1;
      } else if (kind === "number?" && next !== undefined && /^\d+$/.test(next)) {
        value = next;
        i += 1;
      }
    }
    if (kind === "value" && (value === undefined || value.trim() === "")) {
      throw new ArgError(`--${name} needs a value: --${name}=<value> or --${name} <value>.`);
    }
    if (kind === "number?" && value !== undefined && value.trim() === "") {
      throw new ArgError(`--${name}= has no value: write --${name} (default ${DEFAULT_SELECT_COUNT}) or --${name}=<number>.`);
    }
    given.set(name, value ?? true);
  }

  const text = (name: string): string | null => {
    const value = given.get(name);
    return typeof value === "string" ? value.trim() : null;
  };
  const flag = (name: string) => given.get(name) === true;
  const apply = flag("apply");
  const restore = text("restore");
  const select = given.has("select-batch");
  const explainFilter = flag("explain-filter");
  const limitRaw = text("limit");
  const limit = limitRaw === null ? null : wholeNumber("limit", limitRaw, 1);
  const selectRaw = text("select-batch");
  const selectCount = selectRaw === null ? DEFAULT_SELECT_COUNT : wholeNumber("select-batch", selectRaw, 1);
  const minRaw = text("min-specs");
  const minGiven = minRaw === null ? null : wholeNumber("min-specs", minRaw, 0, MAX_MIN_SPECS);
  const allowFewSpecs = flag("allow-few-specs");
  const batchFile = text("batch-file");
  const out = text("out");

  if ([apply, restore !== null, select].filter(Boolean).length > 1) {
    throw new ArgError("Use only one of --apply, --restore, --select-batch.");
  }
  if (explainFilter && (apply || restore !== null)) {
    throw new ArgError("--explain-filter is read-only: it cannot be combined with --apply or --restore.");
  }
  if (explainFilter && (limit !== null || batchFile !== null)) {
    throw new ArgError("--explain-filter looks at every active product without stored text: it takes no --limit or --batch-file.");
  }
  if (select && (limit !== null || batchFile !== null)) {
    throw new ArgError("--select-batch takes its size from --select-batch=<number>; --limit and --batch-file do not apply to it.");
  }
  if (restore !== null && (limit !== null || batchFile !== null)) {
    throw new ArgError("--restore puts back exactly what the backup lists: --limit and --batch-file do not apply to it.");
  }
  if (apply && batchFile === null && limit === null) {
    throw new ArgError("--apply needs --batch-file=<csv> (the reviewed selection) or --limit=<n>; it never writes to every product by default.");
  }

  let outDir: string | null = null;
  let outFile: string | null = null;
  if (out !== null) {
    if (/\.csv$/i.test(out)) {
      if (!select) throw new ArgError("--out=<file>.csv only names the batch file of --select-batch; elsewhere --out is a folder.");
      outFile = out;
    } else {
      outDir = out;
    }
  }

  let minSpecs = DEFAULT_MIN_SPECS;
  let minSpecsSource = "default";
  if (allowFewSpecs) {
    minSpecs = 0;
    minSpecsSource = "--allow-few-specs";
  }
  if (minGiven !== null) {
    minSpecs = minGiven;
    minSpecsSource = allowFewSpecs ? `--min-specs=${minGiven}, which wins over --allow-few-specs` : `--min-specs=${minGiven}`;
  }

  return {
    apply, restore, confirmDb: text("confirm-db"), batchFile, limit, select, selectCount, explainFilter,
    overwrite: flag("overwrite"), applyAlts: flag("apply-alts"), force: flag("force"), allowFewSpecs,
    minSpecs, minSpecsSource, outDir, outFile,
  };
}

/** "minimum specs: 3 (default)" - printed by every mode that filters on it. */
export const describeMinSpecs = (args: Pick<ApplyArgs, "minSpecs" | "minSpecsSource">) =>
  `minimum specs per description: ${args.minSpecs} (${args.minSpecsSource})${args.minSpecs === 0 ? " - title + type only is enough" : ""}`;

/** The summary line for --limit: "limited to 20 of 413". */
export const limitNote = (kept: number, of: number) => `limited to ${kept} of ${of}`;

/** Next free `batch-<N>.csv` number in a folder listing (also reserves the matching summary file name). */
export function nextBatchNumber(fileNames: string[]): number {
  let max = 0;
  for (const name of fileNames) {
    const m = name.match(/^batch-(\d+)(?:-summary)?\.(?:csv|md)$/i);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}
