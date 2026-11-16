"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { adminFormControlClass } from "@/features/admin/products/admin-product-form-primitives";
import {
  SEARCH_TAG_LENGTH_MAX,
  SEARCH_TAGS_MAX,
} from "@/lib/catalog/product-input";
import { cn } from "@/lib/cn";

/**
 * Chip input for a product's search tags (AD-412): type a word, press Enter
 * or a comma to add it, × (or Backspace on an empty box) removes one. Enter
 * never submits the product form.
 */
export function AdminTagsInput({
  id,
  value,
  onChange,
  disabled,
}: {
  id?: string;
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const seen = new Set(value.map((tag) => tag.toLowerCase()));
    const next = [...value];
    for (const part of raw.split(",")) {
      const tag = part.trim().split(/\s+/).join(" ").slice(0, SEARCH_TAG_LENGTH_MAX);
      if (!tag || seen.has(tag.toLowerCase()) || next.length >= SEARCH_TAGS_MAX) {
        continue;
      }
      seen.add(tag.toLowerCase());
      next.push(tag);
    }
    setDraft("");
    if (next.length !== value.length) {
      onChange(next);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      add(draft);
    } else if (event.key === "Backspace" && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div
      className={cn(
        adminFormControlClass,
        "flex h-auto min-h-9 flex-wrap items-center gap-1.5 py-1",
      )}
    >
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded bg-[#3897f0]/10 px-2 py-0.5 text-xs font-medium text-[#1f6fc4]"
        >
          {tag}
          <button
            type="button"
            aria-label={`Remove tag ${tag}`}
            disabled={disabled}
            className="text-[#1f6fc4]/70 hover:text-red-600"
            onClick={() => onChange(value.filter((item) => item !== tag))}
          >
            <X className="size-3" aria-hidden />
          </button>
        </span>
      ))}
      <input
        id={id}
        className="min-w-[10rem] flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400"
        placeholder={
          value.length >= SEARCH_TAGS_MAX
            ? `Up to ${SEARCH_TAGS_MAX} tags`
            : "Type and hit enter to add a tag"
        }
        value={draft}
        disabled={disabled || value.length >= SEARCH_TAGS_MAX}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => add(draft)}
      />
    </div>
  );
}
