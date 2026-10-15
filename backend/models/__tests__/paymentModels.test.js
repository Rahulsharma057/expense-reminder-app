// Run with: node --test models/__tests__/paymentModels.test.js
//
// Confirms ReceivedPayment and SentPayment are genuinely separate models
// (own collection, own schema shape) — there's no shared "direction" flag
// a client could flip to write a sent payment into the received
// collection or vice versa. Pure schema-level checks: no MongoDB
// connection needed, since Mongoose compiles a schema without one.

const test = require("node:test");
const assert = require("node:assert/strict");

const ReceivedPayment = require("../ReceivedPayment");
const SentPayment = require("../SentPayment");

test("ReceivedPayment and SentPayment are different Mongoose models with different collections", () => {
  assert.notEqual(ReceivedPayment.modelName, SentPayment.modelName);
  assert.notEqual(ReceivedPayment.collection.name, SentPayment.collection.name);
});

test("ReceivedPayment has payer/receiver fields; SentPayment does not", () => {
  const paths = Object.keys(ReceivedPayment.schema.paths);
  assert.ok(paths.includes("payerName"));
  assert.ok(paths.includes("receiverName"));
  assert.ok(!paths.includes("payeeName"));
});

test("SentPayment has a payee field; ReceivedPayment does not", () => {
  const paths = Object.keys(SentPayment.schema.paths);
  assert.ok(paths.includes("payeeName"));
  assert.ok(!paths.includes("payerName"));
  assert.ok(!paths.includes("receiverName"));
});

test("neither model has a generic/shared 'direction' field — direction is which collection you write to, not a flag", () => {
  assert.ok(!("direction" in ReceivedPayment.schema.paths));
  assert.ok(!("direction" in SentPayment.schema.paths));
});

test("both models keep Transaction ID, RRN and reference number as independent fields", () => {
  for (const Model of [ReceivedPayment, SentPayment]) {
    const paths = Object.keys(Model.schema.paths);
    assert.ok(paths.includes("transactionId"));
    assert.ok(paths.includes("rrn"));
    assert.ok(paths.includes("referenceNumber"));
  }
});

test("both models require createdBy (ownership can never be client-supplied via a missing field)", () => {
  for (const Model of [ReceivedPayment, SentPayment]) {
    assert.ok(Model.schema.paths.createdBy.isRequired);
  }
});

test("both models default a new record's verificationStatus to 'unverified' at the schema level", () => {
  // The controllers always overwrite this to "manually_confirmed" on
  // create (since nothing saves without the user confirming) — this just
  // confirms the schema's own default hasn't silently changed to
  // something that would look "pre-verified" out of the box.
  for (const Model of [ReceivedPayment, SentPayment]) {
    assert.equal(Model.schema.paths.verificationStatus.defaultValue, "unverified");
  }
});
