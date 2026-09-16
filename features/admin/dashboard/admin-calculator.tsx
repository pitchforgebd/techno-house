"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Calculator, X } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * A quick calculator for the admin dashboard — mental-math relief for
 * discounts, margins, split payments, whatever comes up while working an
 * order. Deliberately a standard four-function calculator, not a formula
 * engine: no expression string is ever parsed or evaluated. Every button
 * press applies to plain JS `number`s through an explicit state machine, so
 * there is nothing here shaped like a string-evaluation builtin — a
 * calculator is exactly the kind of feature where reaching for one is
 * tempting and wrong.
 */

type Operator = "+" | "-" | "×" | "÷";

export type CalcState = {
  /** What the display currently shows, as typed — a string so "1." and
   *  trailing zeros ("1.50") can be mid-entry without being reformatted away. */
  display: string;
  /** The left-hand operand, once an operator has been pressed. */
  accumulator: number | null;
  pendingOperator: Operator | null;
  /** True right after an operator or "=" — the next digit starts a fresh number
   *  instead of appending to the one just computed. */
  awaitingOperand: boolean;
};

export const INITIAL_STATE: CalcState = {
  display: "0",
  accumulator: null,
  pendingOperator: null,
  awaitingOperand: false,
};

const MAX_DISPLAY_DIGITS = 12;

export function apply(a: number, b: number, op: Operator): number | null {
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "×":
      return a * b;
    case "÷":
      return b === 0 ? null : a / b;
  }
}

/** Trims float noise (0.1 + 0.2) and long results to something that fits. */
export function formatResult(value: number): string {
  if (!Number.isFinite(value)) {
    return "Error";
  }
  const rounded = Math.round(value * 1e9) / 1e9;
  const text = rounded.toString();
  if (text.replace(/[-.]/g, "").length <= MAX_DISPLAY_DIGITS) {
    return text;
  }
  return rounded.toExponential(6);
}

export function inputDigit(state: CalcState, digit: string): CalcState {
  if (state.awaitingOperand) {
    return { ...state, display: digit, awaitingOperand: false };
  }
  if (state.display === "0") {
    return { ...state, display: digit };
  }
  if (state.display.replace(/[-.]/g, "").length >= MAX_DISPLAY_DIGITS) {
    return state;
  }
  return { ...state, display: state.display + digit };
}

export function inputDecimal(state: CalcState): CalcState {
  if (state.awaitingOperand) {
    return { ...state, display: "0.", awaitingOperand: false };
  }
  if (state.display.includes(".")) {
    return state;
  }
  return { ...state, display: `${state.display}.` };
}

export function toggleSign(state: CalcState): CalcState {
  if (state.display === "0") {
    return state;
  }
  return {
    ...state,
    display: state.display.startsWith("-")
      ? state.display.slice(1)
      : `-${state.display}`,
  };
}

export function inputPercent(state: CalcState): CalcState {
  const current = Number.parseFloat(state.display);
  if (Number.isNaN(current)) {
    return state;
  }
  // Ordinary calculator convention: with a pending operator, "%" means
  // "percent OF the accumulator" (500 + 10% = 550), matching what someone
  // computing a discount or a service charge expects — not a bare ÷100.
  const value =
    state.accumulator !== null ? (state.accumulator * current) / 100 : current / 100;
  return { ...state, display: formatResult(value) };
}

export function backspace(state: CalcState): CalcState {
  if (state.awaitingOperand || state.display.length <= 1) {
    return { ...state, display: "0" };
  }
  const next = state.display.slice(0, -1);
  return { ...state, display: next === "-" ? "0" : next };
}

export function chooseOperator(state: CalcState, op: Operator): CalcState {
  const current = Number.parseFloat(state.display);
  if (state.accumulator === null) {
    return {
      display: state.display,
      accumulator: current,
      pendingOperator: op,
      awaitingOperand: true,
    };
  }
  // An operator pressed right after another just swaps which one is pending —
  // "5 + ×" behaves as "5 ×", not as computing 5+5 first.
  if (state.awaitingOperand) {
    return { ...state, pendingOperator: op };
  }
  const result = apply(state.accumulator, current, state.pendingOperator ?? op);
  if (result === null) {
    return { ...INITIAL_STATE, display: "Error" };
  }
  return {
    display: formatResult(result),
    accumulator: result,
    pendingOperator: op,
    awaitingOperand: true,
  };
}

export function equals(state: CalcState): CalcState {
  if (state.accumulator === null || state.pendingOperator === null) {
    return state;
  }
  const current = Number.parseFloat(state.display);
  const result = apply(state.accumulator, current, state.pendingOperator);
  if (result === null) {
    return { ...INITIAL_STATE, display: "Error" };
  }
  return {
    display: formatResult(result),
    accumulator: null,
    pendingOperator: null,
    awaitingOperand: true,
  };
}

function keyToOperator(key: string): Operator | null {
  if (key === "/") return "÷";
  if (key === "*") return "×";
  if (key === "+") return "+";
  if (key === "-") return "-";
  return null;
}

export function AdminCalculator() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<CalcState>(INITIAL_STATE);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonId = useId();

  // Close on outside click — a popover left open over the dashboard is a
  // stray always-on-top box the next click should just dismiss, same as any
  // other menu/dropdown in this admin panel.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Keyboard entry, scoped to while the popover is open — an admin reaching
  // for a quick sum expects to type, not click twelve buttons.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key >= "0" && event.key <= "9") {
        setState((s) => inputDigit(s, event.key));
        return;
      }
      const op = keyToOperator(event.key);
      if (op) {
        event.preventDefault();
        setState((s) => chooseOperator(s, op));
        return;
      }
      if (event.key === ".") {
        setState((s) => inputDecimal(s));
      } else if (event.key === "Enter" || event.key === "=") {
        event.preventDefault();
        setState((s) => equals(s));
      } else if (event.key === "Backspace") {
        setState((s) => backspace(s));
      } else if (event.key === "Escape") {
        setOpen(false);
      } else if (event.key.toLowerCase() === "c") {
        setState(INITIAL_STATE);
      } else if (event.key === "%") {
        setState((s) => inputPercent(s));
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        id={buttonId}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex flex-col items-center gap-1.5 rounded-xl border border-black/5 bg-white px-4 py-3 text-center shadow-sm transition-colors hover:border-primary/30 hover:bg-primary-soft/40"
      >
        <span className="flex size-9 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
          <Calculator className="size-5" aria-hidden />
        </span>
        <span className="text-caption font-medium text-text">Calculator</span>
      </button>

      {open ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Calculator"
          className="absolute left-0 top-full z-20 mt-2 w-64 rounded-xl border border-black/10 bg-white p-3 shadow-lg"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-caption font-medium text-text-muted">
              Quick calculator
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close calculator"
              className="text-text-muted hover:text-text"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>

          <div
            className="mb-3 overflow-hidden rounded-lg bg-neutral-900 px-3 py-3 text-right"
            aria-live="polite"
          >
            {state.accumulator !== null ? (
              <p className="truncate text-[11px] text-neutral-400">
                {formatResult(state.accumulator)} {state.pendingOperator}
              </p>
            ) : (
              <p className="text-[11px] text-neutral-400">&nbsp;</p>
            )}
            <p className="truncate text-2xl font-semibold tabular-nums text-white">
              {state.display}
            </p>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            <CalcButton label="C" tone="muted" onClick={() => setState(INITIAL_STATE)} />
            <CalcButton label="⌫" tone="muted" onClick={() => setState(backspace)} />
            <CalcButton label="%" tone="muted" onClick={() => setState(inputPercent)} />
            <CalcButton
              label="÷"
              tone="operator"
              active={state.pendingOperator === "÷" && state.awaitingOperand}
              onClick={() => setState((s) => chooseOperator(s, "÷"))}
            />

            {["7", "8", "9"].map((d) => (
              <CalcButton key={d} label={d} onClick={() => setState((s) => inputDigit(s, d))} />
            ))}
            <CalcButton
              label="×"
              tone="operator"
              active={state.pendingOperator === "×" && state.awaitingOperand}
              onClick={() => setState((s) => chooseOperator(s, "×"))}
            />

            {["4", "5", "6"].map((d) => (
              <CalcButton key={d} label={d} onClick={() => setState((s) => inputDigit(s, d))} />
            ))}
            <CalcButton
              label="-"
              tone="operator"
              active={state.pendingOperator === "-" && state.awaitingOperand}
              onClick={() => setState((s) => chooseOperator(s, "-"))}
            />

            {["1", "2", "3"].map((d) => (
              <CalcButton key={d} label={d} onClick={() => setState((s) => inputDigit(s, d))} />
            ))}
            <CalcButton
              label="+"
              tone="operator"
              active={state.pendingOperator === "+" && state.awaitingOperand}
              onClick={() => setState((s) => chooseOperator(s, "+"))}
            />

            <CalcButton label="±" onClick={() => setState(toggleSign)} />
            <CalcButton label="0" onClick={() => setState((s) => inputDigit(s, "0"))} />
            <CalcButton label="." onClick={() => setState(inputDecimal)} />
            <CalcButton
              label="="
              tone="equals"
              onClick={() => setState(equals)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CalcButton({
  label,
  onClick,
  tone = "digit",
  active = false,
}: {
  label: string;
  onClick: () => void;
  tone?: "digit" | "operator" | "muted" | "equals";
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-10 items-center justify-center rounded-lg text-label font-semibold transition-colors",
        tone === "digit" && "bg-surface-muted text-text hover:bg-border/60",
        tone === "muted" && "bg-surface-muted text-text-muted hover:bg-border/60",
        tone === "operator" &&
          (active
            ? "bg-primary text-primary-foreground"
            : "bg-primary-soft text-primary hover:bg-primary-soft/70"),
        tone === "equals" && "bg-primary text-primary-foreground hover:bg-primary-hover",
      )}
    >
      {label}
    </button>
  );
}
