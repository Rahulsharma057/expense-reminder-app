const mongoose = require("mongoose");

const udhaarSchema = new mongoose.Schema(
  {
    personName: { type: String, required: true, trim: true },
    contactNumber: { type: String, default: "", trim: true },

    // Lent = maine diya hai, Borrowed = maine liya hai
    type: { type: String, enum: ["Lent", "Borrowed"], required: true },
    category: { type: String, enum: ["Cash", "Item"], default: "Cash" },

    amount: { type: Number, default: 0, min: 0 },       // for Cash
    itemDescription: { type: String, default: "", trim: true }, // for Item
    itemQuantity: { type: String, default: "", trim: true },

    date: { type: Date, required: true, default: Date.now },
    expectedReturnDate: { type: Date, default: null },
    actualReturnDate: { type: Date, default: null },

    status: { type: String, enum: ["Pending", "Partially Returned", "Returned"], default: "Pending" },
    returnedAmount: { type: Number, default: 0, min: 0 }, // partial cash returns

    reason: { type: String, default: "", trim: true },
    remarks: { type: String, default: "" },

    photos: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
      },
    ],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

udhaarSchema.index({ date: -1 });
udhaarSchema.index({ personName: 1 });
udhaarSchema.index({ status: 1 });

module.exports = mongoose.model("Udhaar", udhaarSchema);