const mongoose = require("mongoose");

// A saved shape for a task — title, description, default mode, and a
// checklist — so a recurring routine doesn't need to be retyped every
// time. Applying a template just copies these fields into a new Task;
// the template itself is never linked live (editing the template does
// not touch tasks already created from it).

const templateChecklistItemSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const taskTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },

    mode: {
      type: String,
      enum: ["INDIVIDUAL", "SEPARATE", "GROUP"],
      default: "INDIVIDUAL",
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    checklist: [templateChecklistItemSchema],

    recurrence: {
      enabled: { type: Boolean, default: false },
      frequency: { type: String, enum: ["daily", "weekly", "monthly", null], default: null },
    },

    checklistRecurrence: {
      enabled: { type: Boolean, default: false },
      frequency: { type: String, enum: ["daily", "weekly", "monthly", null], default: null },
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

taskTemplateSchema.index({ createdBy: 1, createdAt: -1 });

module.exports = mongoose.model("TaskTemplate", taskTemplateSchema);