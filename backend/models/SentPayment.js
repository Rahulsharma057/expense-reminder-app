const mongoose = require("mongoose");

// Mirrors ReceivedPayment.js but for money going OUT of the logged-in
// user's account. Kept as a separate collection (rather than a `direction`
// flag on one shared model) so a client can never save a sent payment to
// the received-payments endpoint or vice versa without an explicit,
// validated choice of API — see receivedPaymentController.js /
// sentPaymentController.js.
const sentPaymentSchema = new mongoose.Schema(
  {
    payeeName: { type: String, default: "", trim: true },
    amount: { type: Number, required: true, min: 0 },
    transactionId: { type: String, default: "", trim: true },
    // See the matching comment in ReceivedPayment.js — kept separate so a
    // Transaction ID and an RRN/UTR found in the same screenshot never
    // overwrite each other.
    rrn: { type: String, default: "", trim: true },
    referenceNumber: { type: String, default: "", trim: true },
    transactionDate: { type: Date, default: null },
    paymentMethod: { type: String, default: "", trim: true },
    paymentApp: { type: String, default: "", trim: true },

    status: {
      type: String,
      enum: ["pending", "successful", "failed", "unknown"],
      default: "unknown",
    },

    note: { type: String, default: "", trim: true },

    screenshotUrl: { type: String, default: "" },
    screenshotPublicId: { type: String, default: "" },

    extractedText: { type: String, default: "" },

    source: {
      type: String,
      enum: ["shared_image", "shared_text", "manual_upload"],
      default: "manual_upload",
    },

    // Always "manually_confirmed" in practice — every record only reaches
    // the database after the user presses "Confirm & Save" on the review
    // screen. Kept as an enum for forward-compatibility, same as on
    // ReceivedPayment.
    verificationStatus: {
      type: String,
      enum: ["unverified", "manually_confirmed"],
      default: "unverified",
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

sentPaymentSchema.index({ transactionDate: -1 });
sentPaymentSchema.index({ payeeName: 1 });
// Used to detect duplicate transaction IDs for the same user. Living in a
// separate collection from ReceivedPayment means this naturally only ever
// compares against other SENT payments — a shared UTR across a sent and a
// received record (e.g. a refund) is not flagged as a duplicate.
sentPaymentSchema.index({ createdBy: 1, transactionId: 1 });

module.exports = mongoose.model("SentPayment", sentPaymentSchema);
