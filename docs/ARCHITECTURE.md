# Techno House — Architecture

Updated: 2026-08-29  
Task: P0-T05

## Principles

- Server-first Next.js architecture
- TypeScript throughout
- Domain-oriented business logic
- PostgreSQL persistence **later** (Phase 10+)
- Clear separation between UI, domain logic, and data access
- Mock data during frontend-first phases
- Customer/admin boundaries
- Security by design

## Development order (locked)

```text
Reference Analysis → Frontend → Frontend Approval
→ Backend → PostgreSQL → Authentication
→ Orders/Payments → Security → Deployment
```

During frontend phases:

- Do **not** connect PostgreSQL
- Do **not** create Prisma queries
- Do **not** implement real payment gateways
- Do **not** implement production authentication
- Use realistic typed mock data
- Keep a replaceable data-access boundary

---

## Suggested structure

```text
app/
  (storefront)/          # public shop layouts
  (account)/             # /account/*
  (admin)/               # /admin/*
  api/                   # unused until backend phases
components/
  ui/                    # design-system primitives
  layout/                # header, footer, nav
features/
  catalog/
  product/
  cart/
  checkout/
  pc-builder/            # UI only
  account/
  admin/
lib/
  data/
    types/               # domain-shaped DTOs
    repositories/        # interfaces only
    mocks/               # in-memory / JSON implementations
    index.ts             # composition root (mocks now)
  domain/
    pc-builder/          # compatibility — no React
    catalog/             # pure helpers if needed
  validation/            # Zod schemas (shared shapes)
  utils/
prisma/                  # created in Phase 10, not before
public/
tests/
  domain/
docs/
project-memory/
phases/
.cursor/rules/
```

Exact structure may evolve only through documented architectural decisions.

App Router groups keep storefront, account, and admin layouts from leaking chrome into each other.

---

## Rendering

Prefer Server Components.

Use Client Components for:

- browser APIs
- local interactive state
- complex interactive controls
- drag/drop where needed
- live UI interactions (builder, filters sheets, mini-cart)

Catalog listing: Server Component fetches via repository; filter widgets may be client for UX but query stays URL-driven.

---

## Data boundary

Frontend consumes **typed domain-shaped data**, never table rows.

Implemented (P1-T05): `lib/data` composition root, repository interfaces, and mock implementations. UI must import from `@/lib/data` only. Internal check: `/dev/data`.


```text
UI / Server Component
→ repository interface (lib/data/repositories)
→ mock implementation (frontend phases)
→ Prisma/PostgreSQL implementation (Phase 10+, same interface)
```

Rules:

- Presentation components import types + repository functions, not `prisma` and not mock file internals.
- Mocks live only under `lib/data/mocks`.
- List queries support pagination, filters, sort — even when mocked.
- Never import mock JSON from a card component.

Illustrative contract (implement in Phase 01):

```ts
export type ProductListQuery = {
  categorySlug?: string
  brandSlug?: string
  q?: string
  sort?: "featured" | "newest" | "price_asc" | "price_desc" | "discount"
  inStockOnly?: boolean
  filters?: Record<string, string[]>
  page: number
  pageSize: number
}

export interface ProductRepository {
  getBySlug(slug: string): Promise<ProductDetail | null>
  list(query: ProductListQuery): Promise<Paged<ProductSummary>>
}
```

---

## Backend layers (from Phase 10)

```text
Route / Server Action
→ Validation
→ Authorization
→ Domain Service
→ Repository
→ PostgreSQL
```

Do not invent a public REST surface until backend work starts (`docs/API_CONTRACTS.md`).

---

## Admin/customer separation

Admin:
`/admin/*`

Customer:
`/account/*`

Both require independent authorization policies. Separate layouts, separate login routes, separate cookie/session purposes when auth is implemented.

Middleware (later) must not treat `role=admin` in a client JWT as sufficient without server checks.

---

## PC Builder

```text
PC Builder UI (features/pc-builder)
→ lib/domain/pc-builder (selection + totals + warnings)
→ Compatibility engine (pure functions + rule data)
→ Product repository
→ PostgreSQL (later)
```

Compatibility logic must be testable independently of UI.

Frontend: mock parts + engine that can return `compatible | incompatible | unknown`.

Never load the entire component catalog into the client. Fetch candidates per slot.

---

## Cart and pricing

Until Phase 13:

- Cart may be client or mock-server state
- Display totals are non-authoritative
- Checkout payment UI is mock

After Phase 13:

```text
Checkout
→ Server order validation
→ Payment service
→ Gateway adapter
→ Verified callback/webhook
→ Payment state machine
→ Order state update
→ Audit log
```

Never couple core order logic directly to one gateway.

---

## Validation

Zod (or equivalent) for:

- query params
- form input
- mock repository guards

Server-side validation is mandatory once mutations exist.

---

## Testing baseline

- Domain: compatibility engine
- Later: payment state machine, authz

UI tests are not required to start Phase 01.

---

## Explicit non-goals until their phases

| Concern | Phase |
| --- | --- |
| Next.js app scaffold | 01 |
| PostgreSQL / Prisma | 10 |
| Auth / RBAC | 11 |
| Real payments | 13 |
| Production deploy | 18 |
