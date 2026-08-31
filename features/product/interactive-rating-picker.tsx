"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

export function InteractiveRatingPicker({
  value,
  onChange,
  error,
}: {
  value: number;
  onChange: (rating: number) => void;
  error?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
        {Array.from({ length: 5 }, (_, index) => {
          const starValue = index + 1;
          const filled = starValue <= value;
          return (
            <button
              key={starValue}
              type="button"
              role="radio"
              aria-checked={value === starValue}
              aria-label={`${starValue} star${starValue === 1 ? "" : "s"}`}
              onClick={() => onChange(starValue)}
              className="rounded p-0.5 transition-colors hover:text-secondary"
            >
              <Star
                aria-hidden
                strokeWidth={1.75}
                className={cn(
                  "size-6",
                  filled ? "fill-secondary text-secondary" : "text-border",
                )}
              />
            </button>
          );
        })}
      </div>
      {error ? (
        <p className="mt-1 text-caption text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
