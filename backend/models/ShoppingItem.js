const mongoose = require("mongoose");

const shoppingItemSchema = new mongoose.Schema(
  {
    list: { type: mongoose.Schema.Types.ObjectId, ref: "ShoppingList", required: true },
    name: { type: String, required: true, trim: true },
    quantity: { type: String, default: "1" }, // free text — "2 kg", "3 pcs" etc.
    estimatedPrice: { type: Number, default: 0, min: 0 },
    actualPrice: { type: Number, default: 0, min: 0 },
    purchased: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

shoppingItemSchema.index({ list: 1 });

module.exports = mongoose.model("ShoppingItem", shoppingItemSchema);