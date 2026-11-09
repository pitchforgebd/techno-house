// Route-level loading skeleton. Deliberately NOT at the app root: a Suspense
// boundary above the product/category/brand pages makes Next send a 200
// header before notFound() can run (SEO phase 1 — real 404s).
export { default } from "@/components/ui/route-loading-skeleton";
