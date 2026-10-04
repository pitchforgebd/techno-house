/**
 * Input rules for reviews and questions left WITHOUT an account (AD-363).
 * Pure and safe to import from Client Components — no Prisma, no I/O — so the
 * form, the server action and the test suite apply exactly the same rules.
 *
 * A guest has no account to hold them accountable, so these are stricter than
 * the signed-in rules: a real name, no links or markup, an email only if it
 * looks like one. Everything a guest sends still starts as PENDING and is
 * shown only after staff approve it (see `createGuestReview`).
 */

export const GUEST_NAME_MIN = 2;
export const GUEST_NAME_MAX = 80;
export const GUEST_EMAIL_MAX = 254;

const LINK_PATTERN = /https?:\/\/|www\./i;
const MARKUP_PATTERN = /[<>]/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** True for text containing a web address or HTML-style markup. */
export function containsLinkOrMarkup(text: string): boolean {
  return LINK_PATTERN.test(text) || MARKUP_PATTERN.test(text);
}

/** Control characters (tabs and newlines included) have no place in a name or email. */
function hasControlCharacters(text: string): boolean {
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code < 32 || code === 127) {
      return true;
    }
  }
  return false;
}

export type GuestParse<T> = { ok: true; value: T } | { ok: false; formError: string };

/** The visitor's display name: 2-80 characters, spaces collapsed, no links or markup. */
export function parseGuestName(raw: unknown): GuestParse<string> {
  if (typeof raw !== "string") {
    return { ok: false, formError: "Enter your name." };
  }
  const name = raw.split(/\s+/).filter(Boolean).join(" ");
  if (name.length < GUEST_NAME_MIN) {
    return { ok: false, formError: "Enter your name." };
  }
  if (name.length > GUEST_NAME_MAX) {
    return { ok: false, formError: "Name is too long." };
  }
  if (hasControlCharacters(name) || containsLinkOrMarkup(name)) {
    return { ok: false, formError: "Use your real name, without links or symbols like < >." };
  }
  return { ok: true, value: name };
}

/** An optional contact email: empty is fine (stored as null), anything else must look like one. */
export function parseGuestEmail(raw: unknown): GuestParse<string | null> {
  if (raw === undefined || raw === null) {
    return { ok: true, value: null };
  }
  if (typeof raw !== "string") {
    return { ok: false, formError: "Enter a valid email address." };
  }
  const email = raw.trim();
  if (email === "") {
    return { ok: true, value: null };
  }
  if (
    email.length > GUEST_EMAIL_MAX ||
    hasControlCharacters(email) ||
    !EMAIL_PATTERN.test(email)
  ) {
    return { ok: false, formError: "Enter a valid email address." };
  }
  return { ok: true, value: email.toLowerCase() };
}

/** Review text from a guest must not carry links or markup (a signed-in review may). */
export function parseGuestReviewText(body: string): GuestParse<string> {
  if (containsLinkOrMarkup(body)) {
    return { ok: false, formError: "Please do not include links in your review." };
  }
  return { ok: true, value: body };
}

/** Client-side field errors for the guest form (the server repeats every check). */
export function validateGuestIdentity(input: {
  name: string;
  email?: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  const name = parseGuestName(input.name);
  if (!name.ok) {
    errors.name = name.formError;
  }
  const email = parseGuestEmail(input.email);
  if (!email.ok) {
    errors.email = email.formError;
  }
  return errors;
}
