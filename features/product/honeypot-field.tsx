"use client";

/**
 * A field no person ever sees or reaches: it is hidden from sight and from
 * assistive technology, skipped by Tab, and labelled so that it is never
 * autofilled on purpose. A script that fills in every input it finds will fill
 * this one, and the server then drops the submission without an error (AD-363).
 *
 * It is a cheap extra, not a defence on its own — the rate limit and staff
 * moderation are what actually protect the page.
 */
export function HoneypotField({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="sr-only" aria-hidden="true">
      <label>
        Leave this field empty
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    </div>
  );
}
