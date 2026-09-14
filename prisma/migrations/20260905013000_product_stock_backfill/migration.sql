-- Backfill ProductStock for products created without a row (P12-T05).
-- Quantity matches the denormalised Product.stockStatus used by the storefront.

INSERT INTO "ProductStock" ("id", "productId", "quantity", "reserved", "lowStockThreshold", "updatedAt")
SELECT
  'stk' || substr(md5(p.id), 1, 22),
  p.id,
  CASE p."stockStatus"
    WHEN 'IN_STOCK' THEN 25
    WHEN 'LOW_STOCK' THEN 4
    ELSE 0
  END,
  0,
  5,
  NOW()
FROM "Product" p
WHERE NOT EXISTS (
  SELECT 1
  FROM "ProductStock" s
  WHERE s."productId" = p.id
);
