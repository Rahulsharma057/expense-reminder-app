const mongoose = require("mongoose");

const receivedPaymentSchema = new mongoose.Schema(
  {
    payerName: { type: String, default: "", trim: true },
    receiverName: { type: String, default: "", trim: true },
    amount: { type: Number, required: true, min: 0 },
    transactionId: { type: String, default: "", trim: true },
    // Kept separate from transactionId: a screenshot can show a
    // "Transaction ID" AND an "RRN"/"UTR" AND a generic reference number
    // at once (e.g. most UPI apps), and none of them should overwrite
    // another. `transactionId` still gets a best-effort fallback value
    // from these when no explicit "Transaction ID" label exists, so
    // existing single-field records/consumers keep working.
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

    // Every record only ever reaches the database after the user has
    // reviewed and pressed "Confirm & Save" (see ReceivedPaymentForm.js) —
    // nothing in this app auto-saves a parsed/OCR'd draft. "unverified"
    // is kept as the schema default for forward-compatibility with any
    // future unattended-import path, but current code always writes
    // "manually_confirmed".
    verificationStatus: {
      type: String,
      enum: ["unverified", "manually_confirmed"],
      default: "unverified",
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

receivedPaymentSchema.index({ transactionDate: -1 });
receivedPaymentSchema.index({ payerName: 1 });
// Used to detect duplicate transaction IDs for the same user.
receivedPaymentSchema.index({ createdBy: 1, transactionId: 1 });

module.exports = mongoose.model("ReceivedPayment", receivedPaymentSchema);
