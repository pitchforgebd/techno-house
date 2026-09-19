/**
 * Whole-taka amount spelled out for invoice printing, e.g. 199800 ->
 * "One Lakh Ninety-Nine Thousand Eight Hundred Taka Only".
 *
 * Uses the Bangladeshi/Indian numbering system (lakh = 10^5, crore = 10^7),
 * not the international thousand/million/billion grouping — this is what
 * a Bangladeshi customer expects on a printed invoice. Amounts are stored
 * as whole taka (currencyDecimalPlaces is 0 storewide), so there is no
 * paisa/fraction to spell out.
 */
const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

function twoDigits(n: number): string {
  if (n < 20) {
    return ONES[n] ?? "";
  }
  const tens = TENS[Math.floor(n / 10)] ?? "";
  const ones = ONES[n % 10] ?? "";
  return ones ? `${tens}-${ones}` : tens;
}

function threeDigits(n: number): string {
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  const parts = [];
  if (hundred) {
    parts.push(`${ONES[hundred] ?? ""} Hundred`);
  }
  if (rest) {
    parts.push(twoDigits(rest));
  }
  return parts.join(" ");
}

export function amountInWordsBdt(amount: number): string {
  const whole = Math.max(0, Math.round(amount));
  if (whole === 0) {
    return "Zero Taka Only";
  }

  const crore = Math.floor(whole / 1e7);
  const afterCrore = whole % 1e7;
  const lakh = Math.floor(afterCrore / 1e5);
  const afterLakh = afterCrore % 1e5;
  const thousand = Math.floor(afterLakh / 1e3);
  const hundreds = afterLakh % 1e3;

  const segments = [
    crore ? `${threeDigits(crore)} Crore` : null,
    lakh ? `${twoDigits(lakh)} Lakh` : null,
    thousand ? `${twoDigits(thousand)} Thousand` : null,
    hundreds ? threeDigits(hundreds) : null,
  ].filter((segment): segment is string => Boolean(segment));

  return `${segments.join(" ")} Taka Only`;
}
