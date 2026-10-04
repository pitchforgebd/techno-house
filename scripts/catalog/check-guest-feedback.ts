/**
 * Reviews and questions without an account (AD-363).
 *
 *   npm run test:guest-feedback
 *
 * Anyone can now post a review or a question on a product page, so the write is
 * a public endpoint. Two kinds of checks keep it safe:
 *   - the input rules (`lib/catalog/guest-feedback-input.ts`) are pure, so they
 *     are exercised directly with good and hostile input;
 *   - the defences around the write — same-origin check, honeypot, validation
 *     before the rate limit, the rate limit, PENDING-only rows with no user, the
 *     duplicate guard, the staff alert — live in server code that needs a
 *     database, so they are pinned as source guards (in order, where order
 *     matters). The real flow, with every layer, was driven end to end in headless
 *     Chrome against the dev database when this was built (see AD-363 in
 *     project-memory/TASKS.md). No database, no network.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import {
  containsLinkOrMarkup,
  GUEST_EMAIL_MAX,
  GUEST_NAME_MAX,
  GUEST_NAME_MIN,
  parseGuestEmail,
  parseGuestName,
  parseGuestReviewText,
  validateGuestIdentity,
} from "../../lib/catalog/guest-feedback-input";

let checks = 0;
let failures = 0;

function check(name: string, condition: unknown): void {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(`fail ${name}`);
  }
}

/** Source text with Windows line endings normalised, so patterns can use a plain newline. */
function source(path: string): string {
  const crlf = String.fromCharCode(13, 10);
  const lf = String.fromCharCode(10);
  return readFileSync(path, "utf8").split(crlf).join(lf);
}

/** Every .ts/.tsx file under a folder, with forward slashes in the paths. */
function sourceFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry).split(String.fromCharCode(92)).join("/");
    if (statSync(path).isDirectory()) {
      found.push(...sourceFiles(path));
    } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
      found.push(path);
    }
  }
  return found;
}

/** Text of the first function body that starts at `marker` (up to the next top-level export). */
function section(text: string, marker: string): string {
  const start = text.indexOf(marker);
  if (start < 0) {
    return "";
  }
  const next = text.indexOf("\nexport ", start + marker.length);
  return next < 0 ? text.slice(start) : text.slice(start, next);
}

/** True when every needle appears, each after the one before it. */
function inOrder(text: string, needles: string[]): boolean {
  let from = 0;
  for (const needle of needles) {
    const at = text.indexOf(needle, from);
    if (at < 0) {
      return false;
    }
    from = at + needle.length;
  }
  return true;
}

function pureRules(): void {
  // --- name ------------------------------------------------------------------------------------
  const ok = parseGuestName("  Rahim   Uddin ");
  check("a name has its spaces collapsed and trimmed", ok.ok && ok.value === "Rahim Uddin");
  check("a name needs at least 2 characters", !parseGuestName("A").ok && !parseGuestName("   ").ok);
  check("a name of the minimum length is accepted", parseGuestName("Al").ok && GUEST_NAME_MIN === 2);
  check(
    "a name longer than the limit is refused",
    !parseGuestName("x".repeat(GUEST_NAME_MAX + 1)).ok && parseGuestName("x".repeat(GUEST_NAME_MAX)).ok,
  );
  check("a name that is not text is refused", !parseGuestName(undefined).ok && !parseGuestName(42).ok && !parseGuestName(null).ok);
  check(
    "a name cannot carry markup or a link",
    !parseGuestName("<b>x</b>").ok &&
      !parseGuestName("Buy at www.spam.com").ok &&
      !parseGuestName("see https://spam.example").ok &&
      !parseGuestName("HTTP://SPAM.EXAMPLE now").ok,
  );
  check("a name cannot carry control characters", !parseGuestName("Ra" + String.fromCharCode(0) + "him").ok && !parseGuestName("Ra" + String.fromCharCode(127) + "him").ok);
  check("a Bangla name is accepted", parseGuestName("রহিম উদ্দিন").ok);

  // --- email -----------------------------------------------------------------------------------
  const none = parseGuestEmail(undefined);
  check("no email is fine and is stored as null", none.ok && none.value === null);
  const blank = parseGuestEmail("   ");
  check("a blank email is stored as null", blank.ok && blank.value === null);
  const mixed = parseGuestEmail("  ZZTest.Asker@Example.COM ");
  check("an email is trimmed and lowercased", mixed.ok && mixed.value === "zztest.asker@example.com");
  check(
    "an email that does not look like one is refused",
    !parseGuestEmail("not-an-email").ok &&
      !parseGuestEmail("a@b").ok &&
      !parseGuestEmail("a b@c.com").ok &&
      !parseGuestEmail("@c.com").ok,
  );
  check("an email that is not text is refused", !parseGuestEmail(42).ok && !parseGuestEmail({}).ok);
  check(
    "an email over the limit is refused",
    !parseGuestEmail(`${"a".repeat(GUEST_EMAIL_MAX)}@example.com`).ok,
  );
  check("an email cannot carry control characters", !parseGuestEmail("a@b.com" + String.fromCharCode(10) + "bcc: x@y.com").ok);

  // --- links and markup ---------------------------------------------------------------------------
  check(
    "links and markup are detected, ordinary text is not",
    containsLinkOrMarkup("go to www.x.com") &&
      containsLinkOrMarkup("http://x.example") &&
      containsLinkOrMarkup("a <script> b") &&
      !containsLinkOrMarkup("The reader is quick, works well, 5/5.") &&
      !containsLinkOrMarkup("Does it support USB 3.0 & card readers?"),
  );
  check(
    "a guest review cannot carry a link",
    !parseGuestReviewText("Great, see www.spam.com").ok && parseGuestReviewText("Great terminal, very quick.").ok,
  );

  // --- the form's own check (the server repeats every rule) ----------------------------------------
  const bad = validateGuestIdentity({ name: "", email: "nope" });
  check("the form reports a bad name and a bad email", Boolean(bad.name) && Boolean(bad.email));
  check("the form accepts a good name with no email", Object.keys(validateGuestIdentity({ name: "Rahim" })).length === 0);
}

function serverGuards(): void {
  const actions = source("features/product/guest-feedback-actions.ts");
  const lib = source("lib/catalog/customer-reviews.ts");
  const limits = source("lib/auth/rate-limit.ts");

  const reviewAction = section(actions, "export async function createGuestReviewAction");
  const questionAction = section(actions, "export async function createGuestQuestionAction");
  const guestReview = section(lib, "export async function createGuestReview");
  const guestQuestion = section(lib, "export async function createGuestQuestion");

  check("both server actions are found", reviewAction.length > 0 && questionAction.length > 0);
  check("the file is a server-actions module", actions.trimStart().startsWith('"use server"'));

  // order of defences: origin -> honeypot -> validation -> rate limit -> write
  check(
    "a review is checked in order: same-origin, honeypot, validation, rate limit, write",
    inOrder(reviewAction, [
      "isSameOriginRequest()",
      "isHoneypotFilled(input.website)",
      "parseGuestName(",
      "parseCustomerReviewInput(",
      "parseGuestReviewText(",
      "limitGuestContent(",
      "createGuestReview(",
    ]),
  );
  check(
    "a question is checked in order: same-origin, honeypot, validation, rate limit, write",
    inOrder(questionAction, [
      "isSameOriginRequest()",
      "isHoneypotFilled(input.website)",
      "parseGuestName(",
      "parseGuestEmail(",
      "parseCustomerQuestionInput(",
      "limitGuestContent(",
      "createGuestQuestion(",
    ]),
  );
  check(
    "the rate limit is first reached only after every validation, so a typo never costs an attempt",
    reviewAction.indexOf("limitGuestContent(") > reviewAction.indexOf("parseGuestReviewText(") &&
      questionAction.indexOf("limitGuestContent(") > questionAction.indexOf("parseCustomerQuestionInput("),
  );
  check(
    "the rate limit is called once per action (no second, unguarded path to the write)",
    reviewAction.split("limitGuestContent(").length === 2 && questionAction.split("limitGuestContent(").length === 2,
  );
  check(
    "a cross-origin request is refused with the shared message",
    reviewAction.includes("CROSS_ORIGIN_ERROR") && questionAction.includes("CROSS_ORIGIN_ERROR"),
  );
  check(
    "a filled honeypot gets a silent success and nothing is written",
    actions.includes('const RECEIVED: CustomerMutationResult = { ok: true, id: "received" }') &&
      reviewAction.includes("return RECEIVED") &&
      questionAction.includes("return RECEIVED") &&
      actions.includes('value.trim() !== ""'),
  );
  check(
    "the caller is rate-limited by the request's IP address",
    reviewAction.includes("limitGuestContent(meta.ip)") && questionAction.includes("limitGuestContent(meta.ip)"),
  );
  check(
    "a rate-limited caller gets the limiter's answer, not a write",
    reviewAction.includes("if (!limited.ok)") && questionAction.includes("if (!limited.ok)"),
  );

  // the write itself
  for (const [label, body] of [
    ["review", guestReview],
    ["question", guestQuestion],
  ] as const) {
    // Only the create statement counts: the duplicate lookup above it also says `userId: null`.
    const created = body.slice(body.indexOf(".create({"), body.indexOf("select: { id: true }", body.indexOf(".create({")));
    check(`a guest ${label} is created as PENDING with no linked user`, created.length > 0 && created.includes('status: "PENDING"') && created.includes("userId: null"));
    check(`a guest ${label} is created under the visitor's validated name`, created.includes("authorName: name.value") || created.includes("askerName: name.value"));
    check(`a guest ${label} can never be published by the guest (no PUBLISHED / APPROVED status)`, !/status:\s*"(PUBLISHED|APPROVED|ANSWERED)"/.test(body));
    check(`a guest ${label} re-validates the name on the server`, body.includes("parseGuestName(input.name)"));
    check(`a guest ${label} only attaches to an active product`, body.includes("findActiveProduct("));
    check(
      `a guest ${label} sent twice within a day keeps one row`,
      body.includes("GUEST_DUPLICATE_WINDOW_MS") && body.includes("findFirst(") && body.includes("duplicate"),
    );
    check(`a guest ${label} alerts staff`, body.includes("notifyStaffSafe(") && body.includes("(guest)"));
    check(`a guest ${label} does not read a session (it must work signed out)`, !body.includes("getCustomerSession") && !body.includes("requireCustomer"));
  }
  check(
    "a guest review also refuses links in its text on the server",
    guestReview.includes("parseGuestReviewText(parsed.value.body)"),
  );
  check("a guest question stores the optional email, already lowercased by the parser", guestQuestion.includes("askerEmail: email.value"));
  const emailReaders = [
    ...sourceFiles("app/(storefront)"),
    ...sourceFiles("features/product"),
    ...sourceFiles("lib/catalog"),
  ]
    .filter((path) => !path.endsWith("lib/catalog/customer-reviews.ts"))
    .filter((path) => !path.endsWith("lib/catalog/admin-questions.ts"))
    .filter((path) => source(path).includes("askerEmail"));
  check(
    `an asker's email is never read by storefront code, only by staff screens (found in: ${emailReaders.join(", ") || "nowhere else"})`,
    emailReaders.length === 0,
  );
  check("a guest review is never a staff entry", guestReview.includes("isStaffEntry: false"));

  // the rate limit
  check(
    "the guest budget is 5 an hour per caller",
    /guestContentIp:\s*\{\s*limit:\s*5,\s*windowMs:\s*60\s*\*\s*60\s*\*\s*1000\s*\}/.test(limits),
  );
  check(
    "the guest bucket is keyed by a hashed address, never the raw IP",
    section(limits, "export async function limitGuestContent").includes('bucket("guest.content.ip", fingerprint(ip))'),
  );
}

function forms(): void {
  const reviews = source("features/product/product-reviews.tsx");
  const questions = source("features/product/product-questions.tsx");
  const honeypot = source("features/product/honeypot-field.tsx");

  for (const [label, text] of [
    ["review", reviews],
    ["question", questions],
  ] as const) {
    check(`the ${label} form is no longer hidden behind a sign-in gate`, !text.includes("to submit a review for this product") && !text.includes("to ask a question about this product"));
    check(`the ${label} form offers the honeypot to guests only`, text.includes("<HoneypotField") && /session\s*\?\s*null\s*:\s*\(?\s*<HoneypotField/.test(text));
    check(`the ${label} form validates the guest's name before sending`, text.includes("validateGuestIdentity("));
    check(
      `the ${label} form still sends signed-in customers through their own action`,
      text.includes(label === "review" ? "? await createCustomerReviewAction({" : "? await createCustomerQuestionAction({"),
    );
    check(`the ${label} form tells a guest it was received, politely and accessibly`, text.includes('role="status"') && text.includes("Thank you!"));
    check(`the ${label} form still points account holders to sign in`, text.includes("Have an account?") && text.includes("/account/login?next="));
  }
  check("the review form sends guests to the guest action", reviews.includes("createGuestReviewAction({"));
  check("the question form sends guests to the guest action", questions.includes("createGuestQuestionAction({"));
  check("the question form asks for an optional email", questions.includes("pdp-question-email"));
  check("the guest review form checks links in the text on the client too", reviews.includes("parseGuestReviewText(body)"));

  check(
    "the honeypot is invisible and unreachable: aria-hidden, no tab stop, no autofill",
    honeypot.includes('aria-hidden="true"') &&
      honeypot.includes("sr-only") &&
      honeypot.includes("tabIndex={-1}") &&
      honeypot.includes('autoComplete="off"') &&
      honeypot.includes('name="website"'),
  );
}

function main(): void {
  pureRules();
  serverGuards();
  forms();

  if (failures > 0) {
    console.error(`\nguest feedback: ${failures} of ${checks} checks FAILED`);
    process.exit(1);
  }
  console.log(`guest feedback ok — ${checks} checks`);
}

main();
