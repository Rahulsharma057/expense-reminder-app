// Run with: node --test lib/__tests__/ocrParser.test.js
// (plain Node's built-in test runner — this project has no Jest/Vitest
// configured, and ocrParser.js is plain CommonJS specifically so it can
// be required here with zero extra tooling.)

const test = require("node:test");
const assert = require("node:assert/strict");

const { parseTransactionText, detectDirection, wordsToNumber } = require("../ocrParser");

// =============================================================
// THE TWO REAL-WORLD EXAMPLES FROM THE BUG REPORT
// =============================================================

const PAYTM_EXAMPLE = [
  "Cng Filling Station Sec 72a",
  "paytm.s1zzpc8@pty",
  "Six Hundred Fifty Seven Rupees",
  "Paid Successfully",
  "Bhumika Sharma",
  "Bank Of Baroda - 8487",
  "15 Oct, 03:13 PM",
  "Ref No: 6160 9358 7427",
].join("\n");

const UPI_APP_EXAMPLE = [
  "E2PAYJAPP",
  "₹5,000 Payment Successful",
  "11 Oct 2026, 6:46 PM",
  "PAID TO MR Rahul",
  "rahulsharma1101102-1@okhdfcbank",
  "PAID BY B Priti",
  "8005729438@pz",
  "TRANSACTION ID 82940289123",
  "RRN 850316252472",
  "POWERED BY Liz",
].join("\n");

test("Paytm example: amount in words only -> 657", () => {
  const result = parseTransactionText(PAYTM_EXAMPLE);
  assert.equal(result.amount, 657);
  assert.equal(result.amountSource, "words");
});

test("Paytm example: generic Ref No -> normalized reference, no spaces", () => {
  const result = parseTransactionText(PAYTM_EXAMPLE);
  assert.equal(result.referenceNumber, "616093587427");
  // No explicit "Transaction ID"/"RRN" label exists in this text, so the
  // legacy single-field `transactionId` must fall back to it — this is
  // what keeps older single-field consumers/records working.
  assert.equal(result.transactionId, "616093587427");
});

test("Paytm example: status recognizes \"Paid Successfully\"", () => {
  const result = parseTransactionText(PAYTM_EXAMPLE);
  assert.equal(result.status, "successful");
});

test("Paytm example: payment app detected from the UPI handle", () => {
  const result = parseTransactionText(PAYTM_EXAMPLE);
  assert.equal(result.paymentApp, "Paytm");
});

test("Paytm example: account suffix and UPI ID never leak into the amount", () => {
  const result = parseTransactionText(PAYTM_EXAMPLE);
  assert.notEqual(result.amount, 8487);
  assert.notEqual(result.amount, 72);
});

test("UPI app example: digit amount -> 5000", () => {
  const result = parseTransactionText(UPI_APP_EXAMPLE);
  assert.equal(result.amount, 5000);
  assert.equal(result.amountSource, "digits");
});

test("UPI app example: Transaction ID and RRN extracted as separate fields", () => {
  const result = parseTransactionText(UPI_APP_EXAMPLE);
  assert.equal(result.transactionId, "82940289123");
  assert.equal(result.rrn, "850316252472");
  // Neither must overwrite the other.
  assert.notEqual(result.transactionId, result.rrn);
});

test("UPI app example: payee is Rahul, payer is B Priti", () => {
  const result = parseTransactionText(UPI_APP_EXAMPLE);
  assert.equal(result.payeeName, "Rahul");
  assert.equal(result.payerName, "B Priti");
});

test("UPI app example: direction is ambiguous (both \"paid to\" and \"paid by\" present)", () => {
  // The text shows a "Paid To" and a "Paid By" at once — neither party is
  // identifiable as "me", so this must come back null and force the user
  // to choose, never guess one way silently.
  const result = parseTransactionText(UPI_APP_EXAMPLE);
  assert.equal(result.direction, null);
});

test("UPI app example: date/time parsed", () => {
  const result = parseTransactionText(UPI_APP_EXAMPLE);
  assert.ok(result.transactionDate instanceof Date);
  assert.equal(result.transactionDate.getFullYear(), 2026);
  assert.equal(result.transactionDate.getMonth(), 9); // October, 0-indexed
  assert.equal(result.transactionDate.getDate(), 11);
});

// =============================================================
// AMOUNT-IN-WORDS CONVERSION
// =============================================================

test("wordsToNumber: basic compounds", () => {
  assert.equal(wordsToNumber("six hundred fifty seven"), 657);
  assert.equal(wordsToNumber("one thousand two hundred fifty"), 1250);
  assert.equal(wordsToNumber("two thousand five hundred"), 2500);
  assert.equal(wordsToNumber("five hundred"), 500);
});

test("wordsToNumber: lakhs and crores", () => {
  assert.equal(wordsToNumber("two lakh"), 200000);
  assert.equal(wordsToNumber("one crore"), 10000000);
});

test("parseTransactionText: amount-in-words with trailing \"Only\" still parses", () => {
  const result = parseTransactionText("Two Thousand Five Hundred Rupees Only");
  assert.equal(result.amount, 2500);
});

// =============================================================
// DIRECTION DETECTION — the full label set from the spec
// =============================================================

test("detectDirection: unambiguous sent/received phrasing", () => {
  assert.equal(detectDirection("Paid to Bhumika"), "sent");
  assert.equal(detectDirection("Sent Rs.1,000 to Bhumika"), "sent");
  assert.equal(detectDirection("Received Rs.1,000 from Bhumika"), "received");
  assert.equal(detectDirection("Paid by Bhumika"), "received");
});

test("detectDirection: \"Payment Successful\" alone is not a direction signal", () => {
  assert.equal(detectDirection("Payment Successful"), null);
});

// =============================================================
// GUARDS — never mistake a reference number for an amount, or a
// UPI ID / phone number for a transaction ID
// =============================================================

test("a long reference number alone is never picked as the amount", () => {
  const result = parseTransactionText("RRN 850316252472\nNo currency amount anywhere in this text.");
  assert.equal(result.amount, null);
});

test("a UPI ID is never extracted as a transaction ID", () => {
  const result = parseTransactionText("Transaction ID rahul@okaxis\nAmount paid: Rs. 100");
  // "rahul@okaxis" fails the reference value pattern's alnum-only
  // constraint (the "@" breaks it), so nothing should be captured here —
  // confirming the UPI handle doesn't leak through as a transaction ID.
  assert.equal(result.transactionId, "");
});

test("a bare phone number is never extracted as a transaction ID", () => {
  const result = parseTransactionText("Ref No: 9876543210\nAmount: Rs. 200");
  assert.equal(result.referenceNumber, "");
  assert.equal(result.transactionId, "");
});

test("conflicting digit vs word amounts produce a warning instead of a silent pick", () => {
  const result = parseTransactionText("Amount: Rs. 700\nSeven Hundred Fifty Rupees");
  assert.equal(result.amount, 700); // digit value still returned as the best guess
  assert.equal(result.amountSource, "digits");
  assert.ok(result.amountWarning, "expected a warning when digits and words disagree");
});

test("matching digit vs word amounts produce no warning", () => {
  const result = parseTransactionText("Amount: Rs. 657\nSix Hundred Fifty Seven Rupees");
  assert.equal(result.amount, 657);
  assert.equal(result.amountSource, "digits+words");
  assert.equal(result.amountWarning, null);
});

test("missing amount entirely comes back null, not a guess", () => {
  const result = parseTransactionText("Transaction ID 82940289123\nRRN 850316252472\nSuccessful");
  assert.equal(result.amount, null);
});
