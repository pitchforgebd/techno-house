# Accessibility audit — Phase 17 (P17-T05)

**Date:** 2026-09-05  
**Scope:** Storefront/admin keyboard access, focus visibility, labels,
dialog naming, and form error association — against
`docs/DESIGN_SYSTEM.md` (keyboard + WCAG AA contrast intent).  
**Out of scope here:** SEO → **P17-T06**; full automated axe crawl /
screen-reader session → optional follow-up; live contrast tooling on
production URL → Phase 18.

## Method

- Review skip link, `lang`, global focus styles, shell chrome, Field,
  Dialog/Sheet, and icon-only controls
- Spot-check mega menu, hero carousel, and account forms
- Automated baseline: `npm run test:a11y`

## Summary

| Severity | Count | Notes |
| --- | --- | --- |
| Critical | 0 | — |
| High | 1 | Composite inputs hid keyboard focus (fixed) |
| Medium | 2 | Field error wiring (fixed); hero tablist keys |
| Low | 2 | Mega-menu hover-first; admin density |

**Verdict:** Baseline a11y patterns are in place (skip link, `lang`,
global `:focus-visible`, labelled icon buttons, native `<dialog>`
modals). Keyboard focus was missing on several composite search/newsletter
fields; those and Field error association were fixed in this task.

## Findings

### Pass

- **Skip link** to `#main-content` in storefront layout
- **`lang="en"`** on root `<html>`
- **Global `:focus-visible`** outline using `--color-focus`
- **Search / cart / lists / mobile menu** expose `aria-label` or
  sr-only text on icon controls
- **Forms using `Field`** have visible labels; login/register use
  `Field` + alerts
- **Dialog / Sheet / Confirm** use native `<dialog showModal()>`
  (browser focus trap + Esc)
- **Hero / product-rail** prev/next controls have `aria-label`
- **Product gallery** thumbnails named; primary image has `alt`
- **Error / empty states** use `role="alert"` where applicable

### High (fixed)

1. **Composite inputs suppressed focus rings**  
   Header search (`focus:outline-none`), footer track/newsletter
   (`focus-visible:outline-none`), and admin menu search removed the
   global outline without a replacement. Keyboard users lost the focus
   cue. Fixed with `focus-within:outline` on the composite chrome (or
   `focus-visible:ring` on the admin search).

### Medium

1. **`Field` did not expose errors to the control (fixed)**  
   Error text used `role="alert"` but the input lacked `aria-invalid` /
   `aria-describedby`. `Field` now clones the control and wires both.

2. **Hero promotion dots use `role="tablist"` without arrow-key behavior**  
   Buttons are labelled and clickable; full tab-pattern keyboard support
   is not implemented. Acceptable for a simple carousel; upgrade later
   or drop tab roles for a simpler pattern.

### Low

1. **Category mega-menu is hover + focus open**  
   Opens on focus and Esc closes; not a disclosure button pattern.
   Keyboard can reach links; polish optional.

2. **Admin tables are dense**  
   Many controls are labelled; contrast of muted placeholders was not
   instrumented. Staff-facing; revisit with contrast tooling if needed.

## Fixes shipped in P17-T05

- `components/layout/site-header.tsx` — search `focus-within` outline
- `components/layout/site-footer.tsx` — track form `focus-within` outline
- `components/layout/footer-newsletter-form.tsx` — same
- `features/admin/admin-sidebar.tsx` — menu search focus ring
- `components/ui/field.tsx` — `aria-invalid` / `aria-describedby`
- `components/ui/dialog.tsx` / `sheet.tsx` — `aria-labelledby`
- `scripts/a11y/check-baseline.ts` + `npm run test:a11y`

## Deferred

| Item | Owner |
| --- | --- |
| Hero tablist arrow keys / role simplification | polish |
| Full axe CI crawl | optional |
| Measured WCAG contrast on production CSS | Phase 18 |
| SEO audit | P17-T06 (done — see SEO_AUDIT_P17.md) |
| Final regression | P17-T07 |

```bash
npm run test:a11y
```
