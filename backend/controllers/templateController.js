const TaskTemplate = require("../models/TaskTemplate");

// GET /templates — templates I created. (Simple ownership model; open
// it up to org-wide sharing later if needed by changing this filter.)
const listTemplates = async (req, res) => {
  try {
    const templates = await TaskTemplate.find({ createdBy: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.json(templates);
  } catch (err) {
    console.error("listTemplates error:", err);
    return res.status(500).json({ message: "Could not load templates" });
  }
};

// POST /templates
const createTemplate = async (req, res) => {
  try {
    const { name, title, description, mode, priority, checklist, recurrence, checklistRecurrence } = req.body;

    if (!name?.trim() || !title?.trim()) {
      return res.status(400).json({ message: "Template name and task title are required" });
    }

    const safeChecklist = Array.isArray(checklist)
      ? checklist
          .map((item, index) => ({ text: String(item?.text || "").trim(), order: index }))
          .filter((item) => item.text)
      : [];

    const template = await TaskTemplate.create({
      name: name.trim(),
      title: title.trim(),
      description: description?.trim() || "",
      mode: ["INDIVIDUAL", "SEPARATE", "GROUP"].includes(mode) ? mode : "INDIVIDUAL",
      priority: ["low", "medium", "high"].includes(priority) ? priority : "medium",
      checklist: safeChecklist,
      recurrence: recurrence?.enabled ? { enabled: true, frequency: recurrence.frequency } : { enabled: false, frequency: null },
      checklistRecurrence: checklistRecurrence?.enabled
        ? { enabled: true, frequency: checklistRecurrence.frequency }
        : { enabled: false, frequency: null },
      createdBy: req.user._id,
    });

    return res.status(201).json(template);
  } catch (err) {
    console.error("createTemplate error:", err);
    return res.status(500).json({ message: "Could not create template" });
  }
};

// DELETE /templates/:id
const deleteTemplate = async (req, res) => {
  try {
    const template = await TaskTemplate.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!template) return res.status(404).json({ message: "Template not found" });

    return res.json({ success: true });
  } catch (err) {
    console.error("deleteTemplate error:", err);
    return res.status(500).json({ message: "Could not delete template" });
  }
};

module.exports = { listTemplates, createTemplate, deleteTemplate };