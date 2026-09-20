const mongoose = require("mongoose");

const mistakeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },

    category: { type: mongoose.Schema.Types.ObjectId, ref: "MistakeCategory", default: null },

    // Who made this mistake — yourself, a team member, or someone external
    personType: { type: String, enum: ["Self", "TeamMember", "Other"], default: "Self" },
    personUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    personName: { type: String, default: "", trim: true }, // used for "Other", or a cached display name

    severity: { type: String, enum: ["Minor", "Moderate", "Serious"], default: "Moderate" },
    status: { type: String, enum: ["Open", "Resolved"], default: "Open" }, // "Resolved" = fixed / won't happen again

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

mistakeSchema.index({ createdBy: 1 });
mistakeSchema.index({ category: 1 });
mistakeSchema.index({ personType: 1, personUser: 1 });
mistakeSchema.index({ title: "text", description: "text", personName: "text" });

module.exports = mongoose.model("Mistake", mistakeSchema);