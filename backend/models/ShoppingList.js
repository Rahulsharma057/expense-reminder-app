const mongoose = require("mongoose");

const shoppingListSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: ["Grocery", "Travel", "Outing", "Festival", "Custom"], default: "Grocery" },
    budget: { type: Number, default: 0, min: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

shoppingListSchema.index({ createdBy: 1 });

module.exports = mongoose.model("ShoppingList", shoppingListSchema);