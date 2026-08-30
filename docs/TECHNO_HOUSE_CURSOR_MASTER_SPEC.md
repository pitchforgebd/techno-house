# Techno House — Master Project Specification

## Mission

Build a production-grade, original, fast, secure, user-friendly single-vendor technology e-commerce platform.

Reference website:
https://www.ryans.com/

The reference is for UX, information architecture, merchandising, category concepts, filtering, product discovery, and PC Builder inspiration only.

Do not copy:
- source code
- HTML/CSS
- text/content
- images/assets
- logo/branding
- exact visual implementation
- distinctive graphics

## Stack

- Next.js
- React
- TypeScript
- PostgreSQL
- Prisma or another justified PostgreSQL ORM/data layer
- Tailwind CSS
- Zod or equivalent validation
- ESLint
- Prettier

Use current stable versions at implementation time.

## Product scope

- Desktop PCs
- Laptops
- PC components
- Monitors
- GPUs
- CPUs
- Motherboards
- RAM
- SSD/HDD
- PSUs
- Cases
- Coolers
- Networking
- Gaming peripherals
- Keyboards/mice/headsets
- Printers
- UPS
- Storage
- Cables/adapters
- Gadgets/electronics

## Core public routes

- `/`
- `/shop`
- `/category/[slug]`
- `/brand/[slug]`
- `/product/[slug]`
- `/search`
- `/compare`
- `/wishlist`
- `/cart`
- `/checkout`
- `/pc-builder`
- `/offers`
- `/flash-sale`
- `/deals`
- `/blog`
- `/blog/[slug]`
- `/about`
- `/contact`
- `/faq`
- `/support`

Additional routes may be added after analysis.

## Authentication

Customer and admin authentication must be separate.

Customer area:
`/account/*`

Admin area:
`/admin/*`

Admin authorization must be server-side and permission-based.

## Admin requirements

- Dashboard
- Products
- Categories
- Brands
- Attributes
- Units
- Warranty
- Notes
- Bulk import/export
- Reviews
- Orders
- Unpaid orders
- Refunds
- Customers
- Promotions
- Flash sales
- Deals
- Coupons
- Marketing
- Blog
- Newsletter
- Notifications
- Analytics
- GA4
- GTM
- Meta Pixel
- Meta CAPI
- Facebook Catalogue/feed
- Sitemap
- SEO
- Reports
- Design Studio
- Media manager
- Support/tickets
- Product conversations/queries
- Contacts
- Payment methods
- Offline payments
- OTP/SMS
- Business settings
- Features activation
- Languages
- Currency
- SMTP
- Social logins
- Facebook/WhatsApp/Google integrations
- Shipping
- Staff
- Staff permissions
- Profile settings

## PC Builder

Dedicated subsystem with:
- CPU
- Cooler
- Motherboard
- RAM
- GPU
- SSD/HDD
- PSU
- Case
- Fans
- Monitor/peripherals as optional components
- compatibility validation
- running total
- stock status
- warnings
- save/share
- add build to cart

## Development order

1. Reference analysis and project governance
2. Project foundation
3. Global frontend shell
4. Homepage
5. Catalog/search/category
6. Product details
7. Cart/checkout UI
8. PC Builder
9. Customer frontend
10. Admin frontend
11. PostgreSQL/backend foundation
12. Authentication/RBAC
13. Catalog backend
14. Orders/payments/refunds
15. PC Builder backend
16. Marketing/analytics/content
17. Security/performance hardening
18. VPS/cloud deployment

Never start the next phase automatically.
