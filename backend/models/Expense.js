const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    recipientName: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    transactionId: { type: String, default: "", trim: true },
    date: { type: Date, required: true, default: Date.now },
    reason: { type: String, default: "", trim: true },
    description: { type: String, default: "" },
    remarks: { type: String, default: "" },

    mode: {
      type: String,
      enum: ["PhonePe", "Bank Transfer", "Cash", "Other"],
      default: "Cash",
    },
    // Filled in only when mode === "Other" — e.g. "paid via Rahul's UPI"
    paidByOther: { type: String, default: "", trim: true },

    billPhoto: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

expenseSchema.index({ date: -1 });
expenseSchema.index({ recipientName: 1 });

module.exports = mongoose.model("Expense", expenseSchema);
