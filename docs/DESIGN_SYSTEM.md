# Techno House — Design System

Updated: 2026-08-29  
Task: P0-T04

## Design direction

Techno House is an original **premium technology retailer**.

It should feel:

- clean
- modern
- professional
- information-rich without clutter
- responsive
- accessible
- fast

It must **not** resemble the reference site’s branding, color story, logo, banners, or card chrome.

Positioning: confident technical merchant — closer to a precision instruments catalog than a loud marketplace.

Mood: cool slate surfaces, deep teal authority, copper only for promotional emphasis.

---

## Brand tokens (implementation in Phase 01)

Token names are canonical. Hex values are the v1 baseline and may be tuned after UI review — not after copying a competitor.

### Color

| Token | Value | Use |
| --- | --- | --- |
| `background` | `#F4F6F8` | Page |
| `surface` | `#FFFFFF` | Cards, header, sheets |
| `surface-muted` | `#EEF2F5` | Zebra rows, chips |
| `text` | `#0E1A24` | Headings, body |
| `text-muted` | `#5B6B78` | Secondary |
| `border` | `#D7DEE5` | Dividers |
| `primary` | `#125E6A` | Buttons, links, key UI |
| `primary-hover` | `#0E4B55` | Hover |
| `primary-foreground` | `#FFFFFF` | On primary |
| `secondary` | `#B8612C` | Deals, promotional accent only |
| `success` | `#1F7A45` | In stock, paid |
| `warning` | `#B45309` | Low stock, pending |
| `danger` | `#B42318` | Errors, sale emphasis |
| `info` | `#0369A1` | Informational alerts |
| `focus` | `#125E6A` | Focus ring |

Do not hard-code these in random components; use CSS variables / Tailwind theme.

Implemented (P1-T03): `app/globals.css` (`@theme`) and `next/font` in `app/layout.tsx`. Currency: `lib/format/currency.ts` (`৳` / `BDT`).


Dark theme is **not** in v1.

### Typography

| Role | Spec |
| --- | --- |
| Display | Plus Jakarta Sans, 600–700, tight tracking |
| Heading | Plus Jakarta Sans, 600 |
| Body | Plus Jakarta Sans, 400–500, 16px base, 1.5 line-height |
| Label | Plus Jakarta Sans, 500, 14px |
| Caption | Plus Jakarta Sans, 400, 12–13px |
| Numeric / price | Same family, `font-variant-numeric: tabular-nums` |
| SKU / spec keys | IBM Plex Mono, 13px |

If font loading is deferred, system stack: `ui-sans-serif, system-ui, Segoe UI, sans-serif`.

Scale (approx.): 12 / 14 / 16 / 18 / 20 / 24 / 30 / 36 / 48.

### Spacing

Base unit **4px**.

Common: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 96.

Layout max width: **1440px** content, **1600px** catalog with filters / chrome.

### Radius

| Token | Value |
| --- | --- |
| `sm` | 6px |
| `md` | 10px |
| `lg` | 16px |
| `full` | 9999px (pills, avatars) |

### Elevation

Use 0–2 levels only:

- `shadow-sm` for cards
- `shadow-md` for popovers/sheets

No heavy drop shadows, no glassmorphism, no large blur backdrops.

### Motion

- 150–200ms opacity/transform max
- Honor `prefers-reduced-motion`
- No autoplay carousels as the only way to see products

---

## Components (primitives in Phase 01)

Define reusable patterns for:

- buttons (primary, secondary, ghost, danger, small)
- inputs, selects, textareas, checkboxes, radios
- cards
- badges (sale, new, stock, warranty)
- tabs
- tables (admin + compare)
- drawers / sheets
- dialogs
- alerts
- breadcrumbs
- pagination
- skeletons
- empty states
- error states

Implemented (P1-T04): reusable primitives in `components/ui`. Internal preview: `/dev/ui` (noindex).

Implemented (P1-T06): `Skeleton`, `EmptyState`, `ErrorState`, plus App Router `loading.tsx`, `error.tsx`, `not-found.tsx`, and `global-error.tsx`. Error UIs never show stack traces.



Storefront product card (IA, not visual clone):

1. Image 4:3 or 1:1, reserved space (no CLS)
2. Title (2-line clamp)
3. Up to 5 spec chips
4. Price stack (current, optional compare-at)
5. Stock + warranty cue
6. Primary: Add to cart; secondary: wishlist / compare

Admin:

- Same tokens, denser tables, sidebar 248–264px
- Status badges use semantic colors above

---

## UX rules

- Strong visual hierarchy: product name → price → availability → action
- One primary CTA per view
- Readable spec tables (zebra optional, not rainbow)
- Mobile-first consideration; mega-menu becomes a sheet
- Keyboard accessible; visible focus
- Contrast: body text on background ≥ WCAG AA
- Do not use color alone for stock or errors

---

## Copy tone

Original, plain, specific. No slogans copied from the reference. Prices in BDT with a clear `৳` or `Tk` convention — pick **৳** in UI, document in Phase 01.

---

## Pending until UI exists

- Icon set package (header chrome currently uses original inline SVGs)

Hero treatment (UI-T01b): 2/1 split — left slider, two stacked side promos, service strip. Original SVGs in `/public/home/`. Mega-menu columns: `lib/catalog/mega-menu.ts`.
