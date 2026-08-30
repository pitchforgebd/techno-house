"use client";

import { useEffect, useState, useTransition } from "react";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import {
  loadProductPickerOptions,
  type ProductPickerOption,
} from "@/features/account/actions";

export function ProductPickerField({
  id,
  label,
  value,
  onChange,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (slug: string, name: string) => void;
  error?: string;
}) {
  const [options, setOptions] = useState<ProductPickerOption[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      setOptions(await loadProductPickerOptions());
    });
  }, []);

  return (
    <Field
      label={label}
      htmlFor={id}
      error={error}
      hint={pending && options.length === 0 ? "Loading products…" : undefined}
    >
      <Select
        id={id}
        value={value}
        disabled={pending && options.length === 0}
        onChange={(event) => {
          const slug = event.target.value;
          const name = options.find((item) => item.slug === slug)?.name ?? "";
          onChange(slug, name);
        }}
      >
        <option value="">Select a product</option>
        {options.map((item) => (
          <option key={item.slug} value={item.slug}>
            {item.name}
          </option>
        ))}
      </Select>
    </Field>
  );
}
