const Expense = require("../models/Expense");
const Reminder = require("../models/Reminder");
const { asyncHandler } = require("../middleware/errorHandler");

const getSummary = asyncHandler(async (req, res) => {
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [thisMonthAgg, lastMonthAgg, byRecipient, byMode, pendingCount, overdueCount] =
    await Promise.all([
      Expense.aggregate([
        { $match: { date: { $gte: startOfThisMonth } } },
        { $group: { _id: null, sum: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]),
      Expense.aggregate([
        { $match: { date: { $gte: startOfLastMonth, $lt: startOfThisMonth } } },
        { $group: { _id: null, sum: { $sum: "$amount" } } },
      ]),
      Expense.aggregate([
        { $match: { date: { $gte: startOfThisMonth } } },
        { $group: { _id: "$recipientName", sum: { $sum: "$amount" } } },
        { $sort: { sum: -1 } },
        { $limit: 5 },
      ]),
      Expense.aggregate([
        { $match: { date: { $gte: startOfThisMonth } } },
        { $group: { _id: "$mode", sum: { $sum: "$amount" } } },
      ]),
      Reminder.countDocuments({ status: "pending" }),
      Reminder.countDocuments({ status: "pending", dueDate: { $lt: now } }),
    ]);

  res.json({
    thisMonthTotal: thisMonthAgg[0]?.sum || 0,
    thisMonthCount: thisMonthAgg[0]?.count || 0,
    lastMonthTotal: lastMonthAgg[0]?.sum || 0,
    topRecipients: byRecipient.map((r) => ({ name: r._id, total: r.sum })),
    byMode: byMode.map((m) => ({ mode: m._id, total: m.sum })),
    pendingReminders: pendingCount,
    overdueReminders: overdueCount,
  });
});

module.exports = { getSummary };
