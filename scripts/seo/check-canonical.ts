/**
 * SEO phase 1 logic checks — canonical host redirect + listing canonicals.
 *
 *   npm run test:seo-canonical
 *
 * Pure functions only; no server, no database.
 */
import { canonicalHostRedirect } from "@/lib/seo/canonical-host";
import { listingCanonicalUrl } from "@/lib/seo/canonical";

let checks = 0;
let failures = 0;

function expectEqual(name: string, actual: unknown, expected: unknown): void {
  checks += 1;
  if (actual !== expected) {
    failures += 1;
    console.error(`fail ${name}\n  expected ${String(expected)}\n  actual   ${String(actual)}`);
  }
}

const ORIGIN = "https://technohouse.com.bd";

function redirect(host: string | null, proto: string | null, path = "/warranty?x=1") {
  return canonicalHostRedirect({
    host,
    forwardedProto: proto,
    pathAndQuery: path,
    origin: ORIGIN,
  });
}

// --- host redirect ---------------------------------------------------------
expectEqual("www https → apex, path+query kept", redirect("www.technohouse.com.bd", "https"), `${ORIGIN}/warranty?x=1`);
expectEqual("www http → apex", redirect("www.technohouse.com.bd", "http"), `${ORIGIN}/warranty?x=1`);
expectEqual("www, no proto header → apex", redirect("www.technohouse.com.bd", null), `${ORIGIN}/warranty?x=1`);
expectEqual("WWW upper-case host → apex", redirect("WWW.TechnoHouse.com.bd", "https"), `${ORIGIN}/warranty?x=1`);
expectEqual("apex http → https", redirect("technohouse.com.bd", "http"), `${ORIGIN}/warranty?x=1`);
expectEqual("apex proto list 'http,https' uses first hop", redirect("technohouse.com.bd", "http, https"), `${ORIGIN}/warranty?x=1`);
expectEqual("apex https → no redirect", redirect("technohouse.com.bd", "https"), null);
expectEqual("apex, no proto header → no redirect", redirect("technohouse.com.bd", null), null);
expectEqual("root path kept", redirect("www.technohouse.com.bd", "https", "/"), `${ORIGIN}/`);
expectEqual("localhost untouched", redirect("localhost:3000", "http"), null);
expectEqual("127.0.0.1 untouched", redirect("127.0.0.1:3000", "http"), null);
expectEqual("foreign host untouched", redirect("evil.example", "http"), null);
expectEqual("www of a foreign host untouched", redirect("www.evil.example", "https"), null);
expectEqual("lookalike suffix untouched", redirect("www.technohouse.com.bd.evil.example", "https"), null);
expectEqual("missing host untouched", redirect(null, "http"), null);
expectEqual(
  "http APP_URL (local dev) never forces https",
  canonicalHostRedirect({ host: "127.0.0.1:3000", forwardedProto: "http", pathAndQuery: "/", origin: "http://127.0.0.1:3000" }),
  null,
);
expectEqual(
  "malformed origin → no redirect",
  canonicalHostRedirect({ host: "www.x", forwardedProto: "http", pathAndQuery: "/", origin: "not a url" }),
  null,
);

// --- listing canonical -----------------------------------------------------
// listingCanonicalUrl uses publicOrigin() (APP_URL); compare path suffixes.
const base = listingCanonicalUrl("/category/laptop", undefined);
const origin = base.slice(0, -"/category/laptop".length);
function canon(params: Record<string, string | string[] | undefined>) {
  return listingCanonicalUrl("/category/laptop", params).slice(origin.length);
}
expectEqual("no params → clean", canon({}), "/category/laptop");
expectEqual("page=1 → clean", canon({ page: "1" }), "/category/laptop");
expectEqual("page=2 → self with page", canon({ page: "2" }), "/category/laptop?page=2");
expectEqual("page=12 → self with page", canon({ page: "12" }), "/category/laptop?page=12");
expectEqual("page array uses first", canon({ page: ["3", "4"] }), "/category/laptop?page=3");
expectEqual("page=abc → clean", canon({ page: "abc" }), "/category/laptop");
expectEqual("page=-2 → clean", canon({ page: "-2" }), "/category/laptop");
expectEqual("sort only → clean", canon({ sort: "price_asc" }), "/category/laptop");
expectEqual("page + sort → clean", canon({ page: "2", sort: "price_asc" }), "/category/laptop");
expectEqual("page + brand filter → clean", canon({ page: "2", brand: "asus" }), "/category/laptop");
expectEqual("page + pageSize → clean", canon({ page: "2", pageSize: "48" }), "/category/laptop");
expectEqual("attribute filter → clean", canon({ ram: "16gb" }), "/category/laptop");
expectEqual("empty sort ignored", canon({ page: "2", sort: "" }), "/category/laptop?page=2");
expectEqual("undefined value ignored", canon({ page: "2", sort: undefined }), "/category/laptop?page=2");
expectEqual("utm params ignored", canon({ page: "2", utm_source: "fb" }), "/category/laptop?page=2");
expectEqual("fbclid ignored", canon({ fbclid: "abc" }), "/category/laptop");
expectEqual("gclid + page", canon({ gclid: "x", page: "5" }), "/category/laptop?page=5");

console.log(failures === 0 ? `ok ${checks} canonical checks` : `failed ${failures}/${checks} canonical checks`);
if (failures > 0) {
  process.exit(1);
}
