"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { adminFormControlClass } from "@/features/admin/products/admin-product-form-primitives";
import { BUILDER_ATTR_MAX } from "@/lib/catalog/product-input";
import {
  formatAttrList,
  parseAttrList,
  toggleAttrValue,
} from "@/lib/domain/pc-builder/attr-values";
import { cn } from "@/lib/cn";

/**
 * Multi-value PC Builder attribute picker (AD-346). Tick every value a part
 * supports — a board that takes DDR4 *and* DDR5, a cooler for several
 * sockets, a case that holds several board sizes. Anything not in the
 * controlled list goes in the "Other" box (comma-separated).
 *
 * The value is one comma-joined string, the same shape the server stores, so
 * the form's submit contract is unchanged.
 */
export function AdminBuilderMultiSelect({
  id,
  label,
  hint,
  value,
  onChange,
  options,
  otherPlaceholder,
  disabled,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  otherPlaceholder: string;
  disabled?: boolean;
}) {
  const selected = parseAttrList(value, options);
  const selectedKeys = new Set(selected);
  const extras = selected.filter((item) => !options.includes(item));
  // The free-text box keeps its own draft so a trailing comma/space while
  // typing ("DDR3, ") isn't swallowed by re-parsing the joined value.
  const [otherText, setOtherText] = useState(formatAttrList(extras));

  function commitOther(text: string) {
    setOtherText(text);
    const known = selected.filter((item) => options.includes(item));
    onChange(formatAttrList(parseAttrList([...known, text].join(","), options)));
  }

  return (
    <fieldset className="space-y-1.5" disabled={disabled}>
      <legend className="text-sm font-medium text-neutral-700">{label}</legend>
      {hint ? <p className="text-xs text-neutral-500">{hint}</p> : null}
      <div className="flex flex-wrap gap-2 pt-0.5">
        {options.map((option) => {
          const checked = selectedKeys.has(option);
          return (
            <label
              key={option}
              className={cn(
                "inline-flex cursor-pointer select-none items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors focus-within:ring-2 focus-within:ring-[#3897f0]/30",
                checked
                  ? "border-[#3897f0] bg-[#3897f0]/10 text-[#1f6fc0]"
                  : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={() => onChange(toggleAttrValue(value, option, options))}
              />
              <span
                aria-hidden
                className={cn(
                  "inline-flex size-4 items-center justify-center rounded-sm border",
                  checked
                    ? "border-[#3897f0] bg-[#3897f0] text-white"
                    : "border-neutral-300 bg-white",
                )}
              >
                {checked ? <Check className="size-3" strokeWidth={3} /> : null}
              </span>
              {option}
            </label>
          );
        })}
      </div>
      <Input
        id={`${id}-other`}
        aria-label={`${label} — other values`}
        value={otherText}
        onChange={(event) => commitOther(event.target.value)}
        maxLength={BUILDER_ATTR_MAX}
        placeholder={`Other (comma-separated), e.g. ${otherPlaceholder}`}
        className={adminFormControlClass}
        disabled={disabled}
      />
    </fieldset>
  );
}
