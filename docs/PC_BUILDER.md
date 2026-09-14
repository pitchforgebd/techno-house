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
evaluator. `storageInterface` is a domain field only until product rows
store it.

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
