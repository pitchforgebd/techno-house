# Techno House — PC Builder

Updated: 2026-09-05  
P14-T07 adds a build to the cart after a second server check.

## Priority

PC Builder is one of the most important and technically demanding features.

## Component types

Required slots:

- CPU
- CPU cooler
- motherboard
- RAM
- GPU
- SSD
- HDD
- PSU
- case
- case fans

Optional slots:

- monitor
- keyboard
- mouse
- other accessories (UPS, etc.)

## Core features

- component selection
- replace/remove
- running total
- stock status
- compatibility warnings
- required-component logic
- save build
- share build
- add complete build to cart

## Compatibility

Potential rules:

- CPU socket ↔ motherboard socket
- RAM type ↔ motherboard support
- motherboard form factor ↔ case
- GPU clearance ↔ case
- storage interface ↔ motherboard
- PSU capacity/connectors ↔ selected hardware
- cooler compatibility ↔ socket/case constraints

Only implement rules for which reliable product data exists.

Unknown data → `unknown` warning, never a false “compatible” claim.

The engine is a pure `evaluateCompatibility(parts, enabledTypes?)` that
walks `PC_RULE_TYPES`. Run `npm run test:pc-builder` after changing an
evaluator.

### Compatibility data (AD-346 – AD-350)

- Each product stores `builderSocket`, `builderRamType`, `builderFormFactor`,
  `builderStorageInterface` (text) and `builderTdpWatts` (int). The four text
  columns hold a **comma-separated list** ("DDR4, DDR5"); one value is simply a
  one-item list. Two parts fit when their lists **overlap**
  (`lib/domain/pc-builder/attr-values.ts`, case/space/hyphen-insensitive).
- Which fields a slot uses: `SLOT_ATTRIBUTE_FIELDS`; which must be set for a
  part to be "ready": `SLOT_REQUIRED_FIELDS` (`attribute-options.ts`).
- The storefront picker hides incompatible parts and parts missing data a
  check needs; it never penalises a part because the *already-picked* part
  lacks data (`candidateMissingData` in `rankCandidatesForSlot`). Slot loader
  cap is 500 parts (`MAX_SLOT_CANDIDATES`) — filtering is client-side.
- What a picker may OFFER (AD-356): only in-stock (`IN_STOCK`/`LOW_STOCK`),
  non-laptop parts. `listByBuilderSlot` filters stock in SQL and then applies
  `isPickerEligible` (`lib/domain/pc-builder/picker-eligibility.ts`), shared with
  the mock repository. Laptop = a laptop/notebook category slug, SO-DIMM (name or
  `formFactor`), or "laptop"/"notebook" in the name of an internal part; a name
  that also says desktop/PC/computer is kept ("SSD for Desktop & Laptop"), and
  peripherals count only when "for laptop/notebook". This filters what is
  offered, not what is loaded: `listBuilderCandidatesBySlugs` (saved builds,
  compatibility of picked parts) is unfiltered so an old build still opens and
  shows "Out of stock". The select page is rendered per request
  (`Cache-Control: no-store` in production), so stock changes show immediately.
- Staff supply data in Admin → PC Builder → **Compatibility data**
  (`pc_builder.manage`): coverage per slot, inline edit, bulk apply,
  "Auto-fill from product names" (`lib/domain/pc-builder/infer-attrs.ts`,
  fills only empty values), unlink wrongly categorised parts. Staff guide:
  `docs/PC_BUILDER_STAFF_GUIDE.md`.
- New products take their slot from the category (`slot-categories.ts`): the
  product form on create, and bulk import for new rows. Bulk CSV has no builder
  columns; re-importing an existing SKU carries its builder values forward
  (`bulk-builder-carry-forward.ts`) — never remove that, or a re-import wipes
  every tag.
- One-off developer scripts (`npm run catalog:*builder*`) exist for bulk data
  operations; they are dry-run by default and write an undo log.

## Architecture

```text
UI (features/pc-builder)
→ lib/domain/pc-builder
→ compatibility engine (pure)
→ product repository
→ PostgreSQL (Phase 14)
```

Compatibility logic must be independent of React components.

Frontend phases (07):

- Mock `ProductRepository` candidates per slot
- Stub engine with a small rule table
- UI shows warnings from domain results only
- Do not fetch entire catalog

Backend phases (14):

- T01: persist/read slot candidates and builder attributes from `Product`
- T02: persist/read compatibility rules; storefront honors enable/disable
- T03: table-driven engine (`RULE_EVALUATORS`); storage unknown without data
- T04: signed-in builds persist; guests stay on-device
- T05: opaque `thb_` share slugs; guests keep encoded slug maps
- T06: server snapshot of price, stock, and compatibility
- T07: revalidate again, then write through the existing cart path

## Security

Final compatibility and price validation must be server-side after backend integration.

Share links must not expose other customers’ data.

## UX (original)

- Slot list + picker drawer/page
- Summary column: total, power estimate (if data), stock rollup
- Clear empty slot CTAs
- Mobile: one slot editor at a time
