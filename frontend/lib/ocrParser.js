// Parses amount, payee/payer names, transaction references, date, payment
// app and status out of raw text — either OCR output from a screenshot or
// text shared directly from another app. Free, runs entirely client-side,
// no API calls, no hardcoding for any one specific payment app.
//
// This is a best-effort heuristic parser, not a guarantee. Every value it
// returns is a *suggestion* for the user to confirm or correct — nothing
// here should ever be treated as proof a payment happened.
//
// Written as CommonJS (not `export function`) so it can be required
// directly by a plain Node test file via the built-in test runner
// (see lib/__tests__/ocrParser.test.js) without an ESM/bundler setup.
// Next.js's webpack build already interops CJS named exports into the
// `import { x } from "./ocrParser"` statements used elsewhere in the app.

const UPI_ID_REGEX = /\b[\w.+-]{2,}@[a-zA-Z]{2,}\b/g; // e.g. rahul@okicici
const PHONE_REGEX = /\b[6-9]\d{9}\b/g;
const LONG_DIGIT_REGEX = /\b\d{10,}\b/g; // account numbers, long refs

const AMOUNT_LABEL_REGEX =
  /(?:₹|rs\.?|inr|amount\s*[:\-]?)\s?([\d,]+(?:\.\d{1,2})?)/i;
const AMOUNT_SCAN_REGEX =
  /(?:₹|rs\.?|inr|amount\s*[:\-]?)\s?([\d,]+(?:\.\d{1,2})?)/gi;

const DATE_REGEX =
  /\b(\d{1,2}[\/\-. ](?:\d{1,2}|[A-Za-z]{3,9})[\/\-. ]\d{2,4})\b/;
const DATE_NO_YEAR_REGEX =
  /\b(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*)\b/i;
const TIME_REGEX = /\b(\d{1,2}:\d{2}(?::\d{2})?\s?(?:AM|PM|am|pm)?)\b/;

const APP_KEYWORDS = [
  { app: "PhonePe", regex: /phonepe/i },
  { app: "Google Pay", regex: /google\s?pay|gpay/i },
  { app: "Paytm", regex: /paytm/i },
  { app: "WhatsApp", regex: /whatsapp/i },
  { app: "Amazon Pay", regex: /amazon\s?pay/i },
  { app: "BHIM", regex: /\bbhim\b/i },
];

const STATUS_KEYWORDS = [
  // "successful(?:ly)?" also matches "Paid Successfully" (Paytm-style),
  // which a plain \bsuccessful\b would miss — "successfully" is not a
  // separate word boundary away from "successful", it's "successful"+"ly".
  { status: "successful", regex: /\b(successful(?:ly)?|success|completed|credited)\b/i },
  { status: "failed", regex: /\b(failed|declined|unsuccessful)\b/i },
  { status: "pending", regex: /\bpending\b/i },
];

// =============================================================
// DIRECTION DETECTION
// =============================================================

// A bounded gap between two words that tolerates an amount sitting
// between them (e.g. "Sent ₹1,000 to Bhumika", "Transferred Rs. 500
// from X") — a plain \s* only matches whitespace, not that amount text.
// Only newlines are excluded (so the gap can't cross to an unrelated
// line); everything else, including the period in "Rs.", is allowed.
const gap = (first, second) => new RegExp(`\\b${first}\\b[^\\n]{0,25}\\b${second}\\b`, "i");

// Money going OUT of the logged-in user's account.
const SENT_DIRECTION_PATTERNS = [
  gap("paid", "to"),
  gap("sent", "to"),
  gap("payment", "to"),
  gap("transferred", "to"),
  /\bdebited\b/i,
];

// Money coming IN to the logged-in user's account. "Paid by X" is a
// weaker/ambiguous signal but still points at money received.
const RECEIVED_DIRECTION_PATTERNS = [
  gap("received", "from"),
  /\breceived\s*(?:₹|rs\.?|inr)/i,
  /\bcredited\b/i,
  gap("paid", "by"),
  gap("sent", "by"),
  gap("transferred", "from"),
];

/**
 * Guesses which way the money moved, from the logged-in user's point of
 * view: "sent", "received", or null when the text gives no reliable
 * signal, or gives CONFLICTING signals (e.g. a screenshot that shows both
 * "Paid To X" and "Paid By Y" — a third-party reconciliation view where
 * neither party is identifiable as "me"). Saying "Payment Successful"
 * alone never counts as a direction signal either way.
 *
 * This is a suggestion, never a guaranteed classification — callers must
 * still let the user confirm or override it, and must require an
 * explicit choice when this returns null.
 */
function detectDirection(rawText) {
  const text = (rawText || "").trim();
  if (!text) return null;

  const sentHit = SENT_DIRECTION_PATTERNS.some((r) => r.test(text));
  const receivedHit = RECEIVED_DIRECTION_PATTERNS.some((r) => r.test(text));

  if (sentHit && !receivedHit) return "sent";
  if (receivedHit && !sentHit) return "received";
  return null;
}

// =============================================================
// AMOUNT — digits AND amount-in-words, cross-checked
// =============================================================

const UNITS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19,
};

const TENS = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90,
};

const SCALES = {
  hundred: 100,
  thousand: 1000,
  lakh: 100000, lakhs: 100000, lac: 100000, lacs: 100000,
  crore: 10000000, crores: 10000000,
};

const NUMBER_WORD_LIST = [
  ...Object.keys(UNITS),
  ...Object.keys(TENS),
  ...Object.keys(SCALES),
  "and",
].sort((a, b) => b.length - a.length); // longest-first avoids "lakh" eating "lakhs"

const AMOUNT_WORDS_REGEX = new RegExp(
  `\\b((?:(?:${NUMBER_WORD_LIST.join("|")})\\s+)+)rupees?\\b`,
  "i"
);

/**
 * Converts an English number-word phrase ("six hundred fifty seven") into
 * a number (657). Supports units, tens, hundreds, thousands, lakhs and
 * crores. Deliberately NOT a parseInt() on the words — this walks the
 * words left to right accumulating a "current group" and folding it into
 * the running total whenever a scale word (hundred/thousand/lakh/crore)
 * is hit, which is how Indian-English number phrases are actually built.
 * Returns null if no recognizable number word is found at all.
 */
function wordsToNumber(phrase) {
  const words = (phrase || "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => w !== "and");

  if (!words.length) return null;

  let total = 0;
  let current = 0;
  let matchedAny = false;

  for (const word of words) {
    if (word in UNITS) {
      current += UNITS[word];
      matchedAny = true;
    } else if (word in TENS) {
      current += TENS[word];
      matchedAny = true;
    } else if (word === "hundred") {
      current = (current || 1) * 100;
      matchedAny = true;
    } else if (word in SCALES) {
      total += (current || 1) * SCALES[word];
      current = 0;
      matchedAny = true;
    }
    // Unrecognized stray word — ignore rather than fail the whole parse.
  }

  total += current;
  return matchedAny ? total : null;
}

/**
 * Finds the transaction amount, checking BOTH a digit form (₹500, Rs.
 * 500, INR 500, Amount: 500) and an amount-in-words form (Six Hundred
 * Fifty Seven Rupees), and cross-checks them when both are present.
 *
 * Both paths require an explicit anchor (a currency symbol/word, or the
 * word "Amount", or "...Rupees") — a bare number or word sequence with no
 * such anchor is never treated as the amount. This is also why a
 * reference number like "82940289123" can never be picked: it's digits
 * with no currency anchor anywhere near it.
 *
 * Returns { value, source, warning }:
 * - source is "digits", "words", "digits+words" (they agreed), or null.
 * - warning is set only when both forms were found and DISAGREE — the
 *   digit value is still returned as the best guess (it's the more
 *   explicit, usually more prominent figure), but the caller must surface
 *   the warning rather than silently trusting it.
 */
function extractAmount(text) {
  let digitValue = null;

  const labelMatch = text.match(AMOUNT_LABEL_REGEX);
  if (labelMatch) {
    const v = parseFloat(labelMatch[1].replace(/,/g, ""));
    if (!isNaN(v) && v > 0) digitValue = v;
  }

  if (digitValue === null) {
    const matches = [...text.matchAll(AMOUNT_SCAN_REGEX)];
    for (const m of matches) {
      const v = parseFloat(m[1].replace(/,/g, ""));
      if (!isNaN(v) && v > 0 && v < 10000000) {
        digitValue = v;
        break;
      }
    }
  }

  const wordsMatch = text.match(AMOUNT_WORDS_REGEX);
  const wordsValue = wordsMatch ? wordsToNumber(wordsMatch[1]) : null;

  if (digitValue !== null && wordsValue !== null) {
    if (Math.abs(digitValue - wordsValue) < 0.005) {
      return { value: digitValue, source: "digits+words", warning: null };
    }

    return {
      value: digitValue,
      source: "digits",
      warning: `The amount in digits (₹${digitValue.toLocaleString("en-IN")}) and the amount in words (₹${wordsValue.toLocaleString("en-IN")}) don't match — please verify before saving.`,
    };
  }

  if (digitValue !== null) return { value: digitValue, source: "digits", warning: null };
  if (wordsValue !== null) return { value: wordsValue, source: "words", warning: null };
  return { value: null, source: null, warning: null };
}

/**
 * Strips out tokens that commonly get mistaken for the amount (UPI IDs,
 * phone numbers, long reference numbers) before amount extraction, so a
 * stray digit sequence never gets treated as "the biggest number in the
 * image, therefore the amount". (The anchor requirement above already
 * does most of this work; this is defense in depth.)
 */
function sanitizeForAmountScan(text) {
  return text
    .replace(UPI_ID_REGEX, " ")
    .replace(PHONE_REGEX, " ")
    .replace(LONG_DIGIT_REGEX, " ");
}

// =============================================================
// TRANSACTION REFERENCES — generic label detection, not hardcoded to
// any one app. A "Transaction ID", an "RRN"/"UTR", and a generic
// "Reference Number" are kept as separate fields since a screenshot can
// show more than one of them at once and they must not overwrite each
// other.
// =============================================================

// Alnum value, allowing internal spaces/hyphens as OCR commonly inserts
// them ("6160 9358 7427", "1234-5678-9012") — normalized by stripping
// those separators after capture, not by assuming a fixed digit count.
const REF_VALUE_PATTERN = "([A-Za-z0-9](?:[A-Za-z0-9 \\-]{2,30})[A-Za-z0-9]|[A-Za-z0-9]{3,24})";

// The trailing negative lookahead rejects a capture that's actually a
// truncated fragment of a longer UPI-ID-like token (e.g. matching "rahul"
// out of "rahul@okaxis", since "@" isn't in the value's allowed
// character class) — without it, part of a UPI ID could slip through as
// if it were a real reference number.
function buildLabelRegex(labels) {
  return new RegExp(
    `\\b(?:${labels.join("|")})\\b\\s*[:.\\-]?\\s*${REF_VALUE_PATTERN}(?![\\w.+-]*@)`,
    "i"
  );
}

const TRANSACTION_ID_REGEX = buildLabelRegex([
  "transaction\\s*id", "transaction\\s*no\\.?", "transaction\\s*number",
  "txn\\s*id", "txn\\s*no\\.?", "txn\\s*ref",
]);

const ORDER_ID_REGEX = buildLabelRegex(["order\\s*id"]);

const RRN_REGEX = buildLabelRegex(["rrn", "utr"]);

const REFERENCE_REGEX = buildLabelRegex([
  "upi\\s*ref(?:erence)?\\s*(?:no\\.?|number)?",
  "ref(?:erence)?\\s*no\\.?",
  "ref(?:erence)?\\s*number",
  "bank\\s*ref(?:erence)?\\s*no\\.?",
  "bank\\s*reference",
  "payment\\s*reference",
]);

const EXACT_PHONE_REGEX = /^[6-9]\d{9}$/;
const EXACT_DATE_LIKE_REGEX = /^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}$/;

function isPlausibleReference(candidate) {
  if (!candidate) return false;
  if (EXACT_PHONE_REGEX.test(candidate)) return false;
  if (EXACT_DATE_LIKE_REGEX.test(candidate)) return false;
  return true;
}

function extractLabeledValue(text, regex) {
  const match = text.match(regex);
  if (!match) return "";

  const normalized = match[1].trim().replace(/[\s-]/g, "");
  return isPlausibleReference(normalized) ? normalized : "";
}

/**
 * Extracts transaction ID, RRN/UTR, and a generic reference number as
 * independent fields — finding one never overwrites another. `transactionId`
 * additionally falls back through the others (reference number, then RRN,
 * then order ID) when no explicit "Transaction ID" label exists, so older
 * single-field consumers/records still get a usable value — this is what
 * keeps existing records and any code only reading `transactionId`
 * backward-compatible.
 */
function extractReferences(text) {
  const explicitTransactionId = extractLabeledValue(text, TRANSACTION_ID_REGEX);
  const rrn = extractLabeledValue(text, RRN_REGEX);
  const referenceNumber = extractLabeledValue(text, REFERENCE_REGEX);
  const orderId = extractLabeledValue(text, ORDER_ID_REGEX);

  const transactionId = explicitTransactionId || referenceNumber || rrn || orderId || "";

  return { transactionId, rrn, referenceNumber };
}

// =============================================================
// PAYEE / PAYER — generic label detection for both directions at once.
// A screenshot can legitimately show BOTH ("Paid To X" / "Paid By Y" on
// a reconciliation-style view) — both are extracted independently; it's
// up to the caller/user to decide which one is "the other party" once
// they've confirmed the direction.
// =============================================================

const PAYEE_LABEL_REGEX = /\b(?:paid\s*to|sent\s*to|payment\s*to|transferred\s*to|received\s*by)\b\s*[:\-]?\s*([A-Za-z][A-Za-z .]{1,40})/i;
const PAYER_LABEL_REGEX = /\b(?:received\s*from|paid\s*by|sent\s*by|transferred\s*from)\b\s*[:\-]?\s*([A-Za-z][A-Za-z .]{1,40})/i;

const GENERIC_TO_REGEX = /\bto\s*[:\-]?\s*([A-Za-z][A-Za-z .]{1,40})/i;
const GENERIC_FROM_REGEX = /\bfrom\s*[:\-]?\s*([A-Za-z][A-Za-z .]{1,40})/i;

const HONORIFIC_REGEX = /^(?:mr|mrs|ms|miss|dr|shri|smt)\.?\s+/i;

function cleanPersonName(name) {
  if (!name) return "";
  return name.replace(HONORIFIC_REGEX, "").trim().replace(/\s{2,}/g, " ");
}

function extractPayeeName(text) {
  const match = text.match(PAYEE_LABEL_REGEX) || text.match(GENERIC_TO_REGEX);
  return match ? cleanPersonName(match[1]) : "";
}

function extractPayerName(text) {
  const match = text.match(PAYER_LABEL_REGEX) || text.match(GENERIC_FROM_REGEX);
  return match ? cleanPersonName(match[1]) : "";
}

// =============================================================
// DATE / TIME
// =============================================================

function extractDate(text) {
  const timeMatch = text.match(TIME_REGEX);

  const withYear = text.match(DATE_REGEX);
  if (withYear) {
    const raw = timeMatch ? `${withYear[1]} ${timeMatch[1]}` : withYear[1];
    const parsed = new Date(raw);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  // Some apps show "15 Oct, 03:13 PM" with no year at all (implying the
  // current year) — fall back to that, defaulting the year ourselves.
  // The field is optional and editable either way.
  const noYear = text.match(DATE_NO_YEAR_REGEX);
  if (noYear) {
    const currentYear = new Date().getFullYear();
    const raw = timeMatch
      ? `${noYear[1]} ${currentYear} ${timeMatch[1]}`
      : `${noYear[1]} ${currentYear}`;
    const parsed = new Date(raw);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  return null;
}

// =============================================================
// APP / STATUS
// =============================================================

function extractPaymentApp(text) {
  for (const { app, regex } of APP_KEYWORDS) {
    if (regex.test(text)) return app;
  }
  return "";
}

function extractStatus(text) {
  // Finding the word "Successful" in a screenshot is NOT proof the
  // payment actually happened — it only means the sender's app displayed
  // that word. This is a suggestion only; the record's own
  // verificationStatus always stays tied to explicit user confirmation.
  for (const { status, regex } of STATUS_KEYWORDS) {
    if (regex.test(text)) return status;
  }
  return "unknown";
}

// =============================================================
// PUBLIC API
// =============================================================

/**
 * Parses free-form text (OCR output or shared text) into a best-effort
 * transaction draft. Every field may come back empty/null — callers must
 * treat this as a prefill suggestion the user reviews and confirms, never
 * as validated data.
 *
 * Both `payeeName` and `payerName` are always extracted independently
 * (not conditioned on a guessed direction) because a screenshot can show
 * both at once. `direction` is a separate best-effort guess for which
 * one is "the other party" from the logged-in user's point of view —
 * it's null whenever the text doesn't make that unambiguous, and callers
 * must require an explicit user choice in that case.
 */
function parseTransactionText(rawText) {
  const text = (rawText || "").trim();

  if (!text) {
    return {
      direction: null,
      amount: null,
      amountSource: null,
      amountWarning: null,
      payeeName: "",
      payerName: "",
      transactionId: "",
      rrn: "",
      referenceNumber: "",
      transactionDate: null,
      paymentApp: "",
      status: "unknown",
    };
  }

  const sanitized = sanitizeForAmountScan(text);
  const amount = extractAmount(sanitized);
  const refs = extractReferences(text);

  return {
    direction: detectDirection(text),
    amount: amount.value,
    amountSource: amount.source,
    amountWarning: amount.warning,
    payeeName: extractPayeeName(text),
    payerName: extractPayerName(text),
    transactionId: refs.transactionId,
    rrn: refs.rrn,
    referenceNumber: refs.referenceNumber,
    transactionDate: extractDate(text),
    paymentApp: extractPaymentApp(text),
    status: extractStatus(text),
  };
}

module.exports = {
  parseTransactionText,
  detectDirection,
  wordsToNumber,
};
