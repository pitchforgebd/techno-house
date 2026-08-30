# Techno House — PostgreSQL Database

## Database

Production database:
PostgreSQL

ORM/data layer:
Prisma or another justified PostgreSQL-compatible solution.

## Expected domain entities

- User
- Staff
- Role
- Permission
- Category
- Brand
- Product
- ProductVariant
- ProductAttribute
- ProductImage
- ProductStock
- ProductWarranty
- ProductReview
- ProductQuestion
- Cart
- CartItem
- Wishlist
- CompareList
- Order
- OrderItem
- Payment
- Refund
- Coupon
- Promotion
- FlashSale
- ShippingMethod
- ShippingArea
- ShippingZone
- Address
- BlogPost
- BlogCategory
- NewsletterSubscriber
- Notification
- SupportTicket
- Complaint
- MediaAsset
- PCBuild
- PCBuildItem
- PCCompatibilityRule
- AnalyticsConfiguration
- SEOConfiguration
- SiteSettings
- AuditLog

## Rules

- migrations are source-controlled
- no destructive production resets
- use indexes intentionally
- use database constraints for integrity
- use transactions for atomic workflows
- keep database access out of UI
