-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('BDT');

-- CreateEnum
CREATE TYPE "StockStatus" AS ENUM ('IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK');

-- CreateEnum
CREATE TYPE "BuilderSlot" AS ENUM ('CPU', 'CPU_COOLER', 'MOTHERBOARD', 'RAM', 'GPU', 'SSD', 'HDD', 'PSU', 'CASE', 'CASE_FANS', 'MONITOR');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('CUSTOMER', 'STAFF', 'SYSTEM');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'BLOCKED', 'INVITED');

-- CreateEnum
CREATE TYPE "B2BStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "StaffStatus" AS ENUM ('ACTIVE', 'INVITED', 'DISABLED');

-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('PENDING', 'PUBLISHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "QuestionStatus" AS ENUM ('PENDING', 'ANSWERED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RefundChannel" AS ENUM ('WALLET', 'OFFLINE', 'GATEWAY');

-- CreateEnum
CREATE TYPE "RefundPayoutStatus" AS ENUM ('PENDING', 'PAID');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'ENDED');

-- CreateEnum
CREATE TYPE "DiscountKind" AS ENUM ('PERCENT', 'FIXED');

-- CreateEnum
CREATE TYPE "PromotionKind" AS ENUM ('PROMOTION', 'DEAL');

-- CreateEnum
CREATE TYPE "PromotionChannel" AS ENUM ('HOMEPAGE', 'CATEGORY', 'SITEWIDE');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'PENDING', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('DELIVERY', 'WARRANTY', 'ORDER', 'PRODUCT', 'PAYMENT', 'GENERAL');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('NEW', 'READ', 'REPLIED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ComplaintSource" AS ENUM ('CONTACT_FORM', 'PRODUCT_REQUEST', 'FOOTER');

-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "SubscriberStatus" AS ENUM ('SUBSCRIBED', 'UNSUBSCRIBED', 'BOUNCED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS', 'PUSH', 'IN_APP');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('IMAGE', 'SVG', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "PcBuildStatus" AS ENUM ('DRAFT', 'SAVED', 'SHARED');

-- CreateEnum
CREATE TYPE "PcRuleType" AS ENUM ('SOCKET', 'RAM_TYPE', 'PSU_WATTAGE', 'FORM_FACTOR', 'STORAGE_INTERFACE');

-- CreateEnum
CREATE TYPE "AnalyticsProvider" AS ENUM ('GA4', 'GTM', 'META_PIXEL', 'MERCHANT_CENTER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT,
    "fullName" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "emailVerifiedAt" TIMESTAMP(3),
    "phoneVerifiedAt" TIMESTAMP(3),
    "isSuspicious" BOOLEAN NOT NULL DEFAULT false,
    "walletAmount" INTEGER NOT NULL DEFAULT 0,
    "currency" "Currency" NOT NULL DEFAULT 'BDT',
    "city" TEXT,
    "notes" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "area" TEXT,
    "city" TEXT NOT NULL,
    "postcode" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "B2BAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "shopAddress" TEXT,
    "tier" TEXT,
    "discountPercent" INTEGER NOT NULL DEFAULT 0,
    "status" "B2BStatus" NOT NULL DEFAULT 'PENDING',
    "tradeLicenceMedia" TEXT,
    "nidMedia" TEXT,
    "notes" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "B2BAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "department" TEXT,
    "status" "StaffStatus" NOT NULL DEFAULT 'INVITED',
    "roleId" TEXT,
    "lastActiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "groupKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "filterKeys" TEXT[],
    "iconSrc" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoSrc" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductWarranty" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "months" INTEGER,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductWarranty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "warrantyId" TEXT,
    "overview" TEXT[],
    "priceAmount" INTEGER NOT NULL,
    "compareAtAmount" INTEGER,
    "currency" "Currency" NOT NULL DEFAULT 'BDT',
    "stockStatus" "StockStatus" NOT NULL DEFAULT 'IN_STOCK',
    "isNew" BOOLEAN NOT NULL DEFAULT false,
    "isSale" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "builderSlot" "BuilderSlot",
    "builderSocket" TEXT,
    "builderRamType" TEXT,
    "builderFormFactor" TEXT,
    "builderTdpWatts" INTEGER,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "src" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceAmount" INTEGER NOT NULL,
    "compareAtAmount" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAttribute" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "groupLabel" TEXT,
    "unit" TEXT,
    "isFilterable" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductAttribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAttributeValue" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "isHighlight" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductAttributeValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductStock" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 5,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductReview" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT,
    "authorName" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "status" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
    "isStaffEntry" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductQuestion" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT,
    "askerName" TEXT NOT NULL,
    "askerEmail" TEXT,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "answeredBy" TEXT,
    "answeredAt" TIMESTAMP(3),
    "status" "QuestionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cart" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionToken" TEXT,
    "couponCode" TEXT,
    "shippingMethodId" TEXT,
    "shippingAreaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wishlist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wishlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WishlistItem" (
    "id" TEXT NOT NULL,
    "wishlistId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompareList" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompareList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompareListItem" (
    "id" TEXT NOT NULL,
    "compareListId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompareListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "userId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "currency" "Currency" NOT NULL DEFAULT 'BDT',
    "subtotalAmount" INTEGER NOT NULL,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "shippingAmount" INTEGER NOT NULL DEFAULT 0,
    "taxAmount" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" INTEGER NOT NULL,
    "couponId" TEXT,
    "couponCode" TEXT,
    "shippingMethodId" TEXT,
    "shippingMethodLabel" TEXT,
    "shippingAreaId" TEXT,
    "shippingAddress" TEXT NOT NULL,
    "billingAddress" TEXT,
    "notes" TEXT,
    "staffNotes" TEXT,
    "trackingCode" TEXT,
    "carrierId" TEXT,
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "productName" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "unitAmount" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "totalAmount" INTEGER NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "method" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'BDT',
    "transactionRef" TEXT,
    "idempotencyKey" TEXT,
    "failureReason" TEXT,
    "authorizedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefundReason" (
    "id" TEXT NOT NULL,
    "type" "ActorType" NOT NULL DEFAULT 'CUSTOMER',
    "reason" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefundReason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "paymentId" TEXT,
    "requestedById" TEXT,
    "approvedById" TEXT,
    "reasonId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'BDT',
    "status" "RefundStatus" NOT NULL DEFAULT 'REQUESTED',
    "channel" "RefundChannel" NOT NULL DEFAULT 'GATEWAY',
    "payoutStatus" "RefundPayoutStatus" NOT NULL DEFAULT 'PENDING',
    "reasonText" TEXT,
    "isDispute" BOOLEAN NOT NULL DEFAULT false,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefundEvent" (
    "id" TEXT NOT NULL,
    "refundId" TEXT NOT NULL,
    "actorType" "ActorType" NOT NULL,
    "actorName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefundEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "DiscountKind" NOT NULL DEFAULT 'PERCENT',
    "value" INTEGER NOT NULL,
    "label" TEXT,
    "minSpendAmount" INTEGER,
    "usageLimit" INTEGER,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "PromotionKind" NOT NULL DEFAULT 'PROMOTION',
    "channel" "PromotionChannel" NOT NULL DEFAULT 'HOMEPAGE',
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "summary" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "bannerSrc" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionProduct" (
    "promotionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PromotionProduct_pkey" PRIMARY KEY ("promotionId","productId")
);

-- CreateTable
CREATE TABLE "FlashSale" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "bannerSrc" TEXT,
    "maxDiscountPercent" INTEGER,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlashSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlashSaleItem" (
    "flashSaleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "discountPercent" INTEGER,
    "priceAmount" INTEGER,
    "quantityLimit" INTEGER,

    CONSTRAINT "FlashSaleItem_pkey" PRIMARY KEY ("flashSaleId","productId")
);

-- CreateTable
CREATE TABLE "CategoryDiscount" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "discountPercent" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingCountry" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShippingCountry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingState" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShippingState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingCity" (
    "id" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShippingCity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingZone" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingArea" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "cityId" TEXT,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingMethod" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "baseRateAmount" INTEGER,
    "currency" "Currency" NOT NULL DEFAULT 'BDT',
    "isPickup" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingMethodZone" (
    "methodId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "rateAmount" INTEGER,

    CONSTRAINT "ShippingMethodZone_pkey" PRIMARY KEY ("methodId","zoneId")
);

-- CreateTable
CREATE TABLE "ShippingCarrier" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trackingUrlTemplate" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShippingCarrier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "userId" TEXT,
    "orderId" TEXT,
    "subject" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "category" "TicketCategory" NOT NULL DEFAULT 'GENERAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorType" "ActorType" NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorStaffId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Complaint" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "productWanted" TEXT,
    "reply" TEXT,
    "staffNotes" TEXT,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'NEW',
    "source" "ComplaintSource" NOT NULL DEFAULT 'CONTACT_FORM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlogCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogPost" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "body" TEXT NOT NULL,
    "categoryId" TEXT,
    "authorStaffId" TEXT,
    "coverMediaId" TEXT,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "status" "SubscriberStatus" NOT NULL DEFAULT 'SUBSCRIBED',
    "source" TEXT,
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribedAt" TIMESTAMP(3),

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "staffId" TEXT,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "href" TEXT,
    "readAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL DEFAULT 'IMAGE',
    "folder" TEXT NOT NULL DEFAULT 'general',
    "alt" TEXT,
    "sizeBytes" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "uploadedByStaffId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PCBuild" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "status" "PcBuildStatus" NOT NULL DEFAULT 'DRAFT',
    "shareSlug" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "totalAmount" INTEGER,
    "currency" "Currency" NOT NULL DEFAULT 'BDT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PCBuild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PCBuildItem" (
    "id" TEXT NOT NULL,
    "buildId" TEXT NOT NULL,
    "slot" "BuilderSlot" NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "PCBuildItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PCCompatibilityRule" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "PcRuleType" NOT NULL,
    "description" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PCCompatibilityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "storeName" TEXT NOT NULL,
    "legalName" TEXT,
    "supportEmail" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Dhaka',
    "taxId" TEXT,
    "currency" "Currency" NOT NULL DEFAULT 'BDT',
    "currencySymbol" TEXT NOT NULL DEFAULT '৳',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SEOConfiguration" (
    "id" TEXT NOT NULL,
    "path" TEXT,
    "title" TEXT,
    "description" TEXT,
    "keywords" TEXT[],
    "ogImageMediaId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SEOConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsConfiguration" (
    "id" TEXT NOT NULL,
    "provider" "AnalyticsProvider" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "publicId" TEXT,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorType" "ActorType" NOT NULL,
    "actorId" TEXT,
    "actorLabel" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_RelatedProducts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RelatedProducts_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "Address_userId_idx" ON "Address"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "B2BAccount_userId_key" ON "B2BAccount"("userId");

-- CreateIndex
CREATE INDEX "B2BAccount_status_idx" ON "B2BAccount"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_email_key" ON "Staff"("email");

-- CreateIndex
CREATE INDEX "Staff_roleId_idx" ON "Staff"("roleId");

-- CreateIndex
CREATE INDEX "Staff_status_idx" ON "Staff"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Role_key_key" ON "Role"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE INDEX "Permission_groupKey_idx" ON "Permission"("groupKey");

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

-- CreateIndex
CREATE INDEX "Category_isActive_idx" ON "Category"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_slug_key" ON "Brand"("slug");

-- CreateIndex
CREATE INDEX "Brand_isActive_idx" ON "Brand"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ProductWarranty_code_key" ON "ProductWarranty"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_brandId_idx" ON "Product"("brandId");

-- CreateIndex
CREATE INDEX "Product_isActive_publishedAt_idx" ON "Product"("isActive", "publishedAt");

-- CreateIndex
CREATE INDEX "Product_priceAmount_idx" ON "Product"("priceAmount");

-- CreateIndex
CREATE INDEX "Product_builderSlot_idx" ON "Product"("builderSlot");

-- CreateIndex
CREATE INDEX "ProductImage_productId_position_idx" ON "ProductImage"("productId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");

-- CreateIndex
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAttribute_key_key" ON "ProductAttribute"("key");

-- CreateIndex
CREATE INDEX "ProductAttributeValue_attributeId_value_idx" ON "ProductAttributeValue"("attributeId", "value");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAttributeValue_productId_attributeId_key" ON "ProductAttributeValue"("productId", "attributeId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductStock_productId_key" ON "ProductStock"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductStock_variantId_key" ON "ProductStock"("variantId");

-- CreateIndex
CREATE INDEX "ProductReview_productId_status_idx" ON "ProductReview"("productId", "status");

-- CreateIndex
CREATE INDEX "ProductReview_userId_idx" ON "ProductReview"("userId");

-- CreateIndex
CREATE INDEX "ProductQuestion_productId_status_idx" ON "ProductQuestion"("productId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_sessionToken_key" ON "Cart"("sessionToken");

-- CreateIndex
CREATE INDEX "Cart_userId_idx" ON "Cart"("userId");

-- CreateIndex
CREATE INDEX "CartItem_productId_idx" ON "CartItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_cartId_productId_variantId_key" ON "CartItem"("cartId", "productId", "variantId");

-- CreateIndex
CREATE UNIQUE INDEX "Wishlist_userId_key" ON "Wishlist"("userId");

-- CreateIndex
CREATE INDEX "WishlistItem_productId_idx" ON "WishlistItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "WishlistItem_wishlistId_productId_key" ON "WishlistItem"("wishlistId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "CompareList_userId_key" ON "CompareList"("userId");

-- CreateIndex
CREATE INDEX "CompareListItem_productId_idx" ON "CompareListItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "CompareListItem_compareListId_productId_key" ON "CompareListItem"("compareListId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_number_key" ON "Order"("number");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_paymentStatus_idx" ON "Order"("paymentStatus");

-- CreateIndex
CREATE INDEX "Order_placedAt_idx" ON "Order"("placedAt");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_provider_transactionRef_key" ON "Payment"("provider", "transactionRef");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_code_key" ON "Refund"("code");

-- CreateIndex
CREATE INDEX "Refund_orderId_idx" ON "Refund"("orderId");

-- CreateIndex
CREATE INDEX "Refund_status_idx" ON "Refund"("status");

-- CreateIndex
CREATE INDEX "Refund_isDispute_idx" ON "Refund"("isDispute");

-- CreateIndex
CREATE INDEX "RefundEvent_refundId_createdAt_idx" ON "RefundEvent"("refundId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateIndex
CREATE INDEX "Coupon_isActive_startsAt_endsAt_idx" ON "Coupon"("isActive", "startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Promotion_slug_key" ON "Promotion"("slug");

-- CreateIndex
CREATE INDEX "Promotion_status_startsAt_endsAt_idx" ON "Promotion"("status", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "PromotionProduct_productId_idx" ON "PromotionProduct"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "FlashSale_slug_key" ON "FlashSale"("slug");

-- CreateIndex
CREATE INDEX "FlashSale_status_startsAt_endsAt_idx" ON "FlashSale"("status", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "FlashSaleItem_productId_idx" ON "FlashSaleItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryDiscount_categoryId_key" ON "CategoryDiscount"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingCountry_code_key" ON "ShippingCountry"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingState_countryId_name_key" ON "ShippingState"("countryId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingCity_stateId_name_key" ON "ShippingCity"("stateId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingZone_code_key" ON "ShippingZone"("code");

-- CreateIndex
CREATE INDEX "ShippingArea_cityId_idx" ON "ShippingArea"("cityId");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingArea_zoneId_name_key" ON "ShippingArea"("zoneId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingMethod_code_key" ON "ShippingMethod"("code");

-- CreateIndex
CREATE INDEX "ShippingMethodZone_zoneId_idx" ON "ShippingMethodZone"("zoneId");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingCarrier_code_key" ON "ShippingCarrier"("code");

-- CreateIndex
CREATE UNIQUE INDEX "SupportTicket_number_key" ON "SupportTicket"("number");

-- CreateIndex
CREATE INDEX "SupportTicket_status_updatedAt_idx" ON "SupportTicket"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "SupportTicket_userId_idx" ON "SupportTicket"("userId");

-- CreateIndex
CREATE INDEX "SupportMessage_ticketId_createdAt_idx" ON "SupportMessage"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "Complaint_status_createdAt_idx" ON "Complaint"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Complaint_source_idx" ON "Complaint"("source");

-- CreateIndex
CREATE UNIQUE INDEX "BlogCategory_slug_key" ON "BlogCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost"("slug");

-- CreateIndex
CREATE INDEX "BlogPost_status_publishedAt_idx" ON "BlogPost"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "BlogPost_categoryId_idx" ON "BlogPost"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_status_idx" ON "NewsletterSubscriber"("status");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_staffId_readAt_idx" ON "Notification"("staffId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_path_key" ON "MediaAsset"("path");

-- CreateIndex
CREATE INDEX "MediaAsset_folder_idx" ON "MediaAsset"("folder");

-- CreateIndex
CREATE UNIQUE INDEX "PCBuild_shareSlug_key" ON "PCBuild"("shareSlug");

-- CreateIndex
CREATE INDEX "PCBuild_userId_idx" ON "PCBuild"("userId");

-- CreateIndex
CREATE INDEX "PCBuild_status_idx" ON "PCBuild"("status");

-- CreateIndex
CREATE INDEX "PCBuildItem_productId_idx" ON "PCBuildItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "PCBuildItem_buildId_slot_key" ON "PCBuildItem"("buildId", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "PCCompatibilityRule_key_key" ON "PCCompatibilityRule"("key");

-- CreateIndex
CREATE INDEX "PCCompatibilityRule_type_idx" ON "PCCompatibilityRule"("type");

-- CreateIndex
CREATE UNIQUE INDEX "SEOConfiguration_path_key" ON "SEOConfiguration"("path");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsConfiguration_provider_key" ON "AnalyticsConfiguration"("provider");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorType_actorId_idx" ON "AuditLog"("actorType", "actorId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "_RelatedProducts_B_index" ON "_RelatedProducts"("B");

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2BAccount" ADD CONSTRAINT "B2BAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_warrantyId_fkey" FOREIGN KEY ("warrantyId") REFERENCES "ProductWarranty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "ProductAttribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductStock" ADD CONSTRAINT "ProductStock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductStock" ADD CONSTRAINT "ProductStock_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductQuestion" ADD CONSTRAINT "ProductQuestion_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductQuestion" ADD CONSTRAINT "ProductQuestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_shippingMethodId_fkey" FOREIGN KEY ("shippingMethodId") REFERENCES "ShippingMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_shippingAreaId_fkey" FOREIGN KEY ("shippingAreaId") REFERENCES "ShippingArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_wishlistId_fkey" FOREIGN KEY ("wishlistId") REFERENCES "Wishlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompareList" ADD CONSTRAINT "CompareList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompareListItem" ADD CONSTRAINT "CompareListItem_compareListId_fkey" FOREIGN KEY ("compareListId") REFERENCES "CompareList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompareListItem" ADD CONSTRAINT "CompareListItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_shippingMethodId_fkey" FOREIGN KEY ("shippingMethodId") REFERENCES "ShippingMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_shippingAreaId_fkey" FOREIGN KEY ("shippingAreaId") REFERENCES "ShippingArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "ShippingCarrier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_reasonId_fkey" FOREIGN KEY ("reasonId") REFERENCES "RefundReason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundEvent" ADD CONSTRAINT "RefundEvent_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "Refund"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionProduct" ADD CONSTRAINT "PromotionProduct_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionProduct" ADD CONSTRAINT "PromotionProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashSaleItem" ADD CONSTRAINT "FlashSaleItem_flashSaleId_fkey" FOREIGN KEY ("flashSaleId") REFERENCES "FlashSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashSaleItem" ADD CONSTRAINT "FlashSaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryDiscount" ADD CONSTRAINT "CategoryDiscount_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingState" ADD CONSTRAINT "ShippingState_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "ShippingCountry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingCity" ADD CONSTRAINT "ShippingCity_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "ShippingState"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingArea" ADD CONSTRAINT "ShippingArea_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "ShippingZone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingArea" ADD CONSTRAINT "ShippingArea_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "ShippingCity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingMethodZone" ADD CONSTRAINT "ShippingMethodZone_methodId_fkey" FOREIGN KEY ("methodId") REFERENCES "ShippingMethod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingMethodZone" ADD CONSTRAINT "ShippingMethodZone_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "ShippingZone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_authorStaffId_fkey" FOREIGN KEY ("authorStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "BlogCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_authorStaffId_fkey" FOREIGN KEY ("authorStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_coverMediaId_fkey" FOREIGN KEY ("coverMediaId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_uploadedByStaffId_fkey" FOREIGN KEY ("uploadedByStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PCBuild" ADD CONSTRAINT "PCBuild_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PCBuildItem" ADD CONSTRAINT "PCBuildItem_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "PCBuild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PCBuildItem" ADD CONSTRAINT "PCBuildItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RelatedProducts" ADD CONSTRAINT "_RelatedProducts_A_fkey" FOREIGN KEY ("A") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RelatedProducts" ADD CONSTRAINT "_RelatedProducts_B_fkey" FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
