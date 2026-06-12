/** Counts whitespace-separated words, treating null/empty strings as zero words. */
export function wordCount(text: string | undefined | null): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Patterns that indicate the lead text may contain PII: phone numbers, email
 * addresses, GSTIN, credit-card-like digit runs, or social links.
 */
const PII_PATTERNS: RegExp[] = [
  /\+91[\s-]?[6-9]\d{9}/,
  /\b0?[6-9]\d{9}\b/,
  /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/,
  /\b[0-9]{2}[a-z]{5}[0-9]{4}[a-z][a-z0-9]z[a-z0-9]\b/,
  /\b(?:\d[ -]*?){13,16}\b/,
  /facebook/,
  /linkdin/,
  /linkedin/,
];

export function looksLikePii(text: string): boolean {
  const lower = text.toLowerCase();
  return PII_PATTERNS.some((re) => re.test(lower));
}

/** Phrases that suggest the buyer is offering/supplying rather than buying. */
const SELLING_PHRASES: string[] = [
  "sell",
  "i want to sale",
  "available for sale",
  "i have for sale",
  "contact to buy from us",
  "we manufacture",
  "offering at best rate",
  "we have material ready",
  "we deal in",
  "our company produces",
  "we are manufacturers of",
  "available immediately",
  "bulk quantity ready for dispatch",
];

export function looksLikeSellingIntent(text: string): boolean {
  const lower = text.toLowerCase();
  return SELLING_PHRASES.some((phrase) => lower.includes(phrase));
}

/** Probable order values above this (in INR) trigger the absurd-quantity check. */
export const ORDER_VALUE_THRESHOLD = 1_000_000_000_000;

/**
 * Removes an item-specific-question (by label) and its matching answer from
 * parallel isq_asked / isq_filled arrays, returning new arrays.
 */
export function removeIsqEntry(
  asked: string[],
  filled: (string | number)[],
  label: string
): { asked: string[]; filled: (string | number)[] } {
  const idx = asked.indexOf(label);
  if (idx === -1) return { asked, filled };
  const nextAsked = [...asked];
  const nextFilled = [...filled];
  nextAsked.splice(idx, 1);
  nextFilled.splice(idx, 1);
  return { asked: nextAsked, filled: nextFilled };
}

/**
 * Adds or updates an item-specific-question entry, returning new arrays.
 */
export function upsertIsqEntry(
  asked: string[],
  filled: (string | number)[],
  label: string,
  value: string | number
): { asked: string[]; filled: (string | number)[] } {
  const idx = asked.indexOf(label);
  if (idx !== -1) {
    const nextFilled = [...filled];
    nextFilled[idx] = value;
    return { asked, filled: nextFilled };
  }
  return { asked: [...asked, label], filled: [...filled, value] };
}
