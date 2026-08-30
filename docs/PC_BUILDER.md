# Techno House — PC Builder

Updated: 2026-08-29  
Phase 00 architecture notes added.

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

- Persist builds, share tokens, server-side revalidation
- Recalculate price and compatibility on add-to-cart

## Security

Final compatibility and price validation must be server-side after backend integration.

Share links must not expose other customers’ data.

## UX (original)

- Slot list + picker drawer/page
- Summary column: total, power estimate (if data), stock rollup
- Clear empty slot CTAs
- Mobile: one slot editor at a time
