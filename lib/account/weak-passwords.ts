/**
 * Weak-password rejection (F-07).
 *
 * The policy was length-only, so `password`, `12345678` and `technohouse` were
 * all accepted. Length alone is a poor predictor: credential-stuffing lists are
 * dominated by passwords that clear eight characters comfortably.
 *
 * Two deliberate choices:
 *
 *   - **No network call.** The Pwned Passwords k-anonymity API is the stronger
 *     check, but it puts a third-party HTTP request on the registration path:
 *     it can be slow, it can be down, and then every sign-up either blocks or
 *     silently degrades to no check at all. This runs offline and always.
 *   - **No new dependency.** A bundled top-10k list would be better coverage,
 *     but this list plus the structural rules below already catches the
 *     overwhelming majority of what stuffing tools actually try, at a fraction
 *     of the size.
 *
 * The structural rules matter as much as the list, because they generalise:
 * `aaaaaaaa`, `12345678`, `qwertyui` and `technohouse2024` are all caught by
 * shape rather than by being enumerated.
 */

/** Lower-cased. Checked against the whole password, not as a substring. */
const COMMON_PASSWORDS = new Set([
  "password", "password1", "password12", "password123", "password1234",
  "passw0rd", "p@ssword", "p@ssw0rd", "passsword", "password!",
  "12345678", "123456789", "1234567890", "123123123", "111111111",
  "87654321", "12341234", "11223344", "12121212", "10101010",
  "qwertyui", "qwerty123", "qwertyuiop", "asdfghjkl", "zxcvbnm123",
  "1qaz2wsx", "qazwsxedc", "1q2w3e4r", "1q2w3e4r5t", "q1w2e3r4",
  "iloveyou", "sunshine", "princess", "football", "baseball",
  "superman", "batman123", "trustno1", "starwars", "pokemon1",
  "welcome1", "welcome123", "letmein1", "letmein123", "admin123",
  "administrator", "adminadmin", "root1234", "toor1234", "changeme",
  "abc12345", "abcd1234", "abcdefgh", "a1b2c3d4", "test1234",
  "monkey12", "dragon123", "master123", "shadow123", "michael1",
  "whatever", "computer", "internet", "samsung1", "google123",
  "bangladesh", "dhaka1234", "bismillah", "ilovemymom", "mypassword",
]);

/** Words that are guessable for anyone who knows the site. */
const SITE_WORDS = ["techno", "technohouse", "house", "th2024", "th2025"];

/** Keyboard runs, checked in both directions. */
const SEQUENCES = [
  "abcdefghijklmnopqrstuvwxyz",
  "01234567890",
  "qwertyuiop",
  "asdfghjkl",
  "zxcvbnm",
];

function stripTrailingDigits(value: string): string {
  return value.replace(/\d+$/, "");
}

/** True when the whole password is one repeated character. */
function isSingleCharacter(value: string): boolean {
  return value.length > 0 && new Set(value).size === 1;
}

/** True when the password is a run of >= 6 along a keyboard row or the alphabet. */
function isSequential(value: string): boolean {
  const lower = value.toLowerCase();
  if (lower.length < 6) {
    return false;
  }
  for (const sequence of SEQUENCES) {
    const reversed = [...sequence].reverse().join("");
    for (const haystack of [sequence, reversed]) {
      for (let start = 0; start + lower.length <= haystack.length; start += 1) {
        if (haystack.slice(start, start + lower.length) === lower) {
          return true;
        }
      }
    }
  }
  return false;
}

export type WeakPasswordContext = {
  email?: string;
  fullName?: string;
};

/**
 * Returns a reason the password is too guessable, or `null` when it is fine.
 *
 * Messages say what to change without lecturing, and never echo the password.
 */
export function weakPasswordReason(
  password: string,
  context: WeakPasswordContext = {},
): string | null {
  const lower = password.toLowerCase();

  if (isSingleCharacter(password)) {
    return "That is the same character repeated. Use a mix of words or characters.";
  }
  if (isSequential(password)) {
    return "That is a straight run of keys. Use something less predictable.";
  }
  if (COMMON_PASSWORDS.has(lower) || COMMON_PASSWORDS.has(stripTrailingDigits(lower))) {
    return "That password appears in common password lists. Choose something else.";
  }

  // Anything built around the site's own name is the first thing guessed.
  const withoutDigits = stripTrailingDigits(lower);
  if (SITE_WORDS.includes(withoutDigits) || SITE_WORDS.includes(lower)) {
    return "Do not use the shop's name as your password.";
  }

  // The account's own identifiers are equally guessable.
  const localPart = (context.email ?? "").split("@")[0]?.toLowerCase() ?? "";
  if (localPart.length >= 4 && lower.includes(localPart)) {
    return "Do not use your email address in your password.";
  }
  const name = (context.fullName ?? "").trim().toLowerCase();
  if (name.length >= 4 && lower.includes(name.replace(/\s+/g, ""))) {
    return "Do not use your name in your password.";
  }

  return null;
}
