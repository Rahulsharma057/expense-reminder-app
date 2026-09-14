const Expense = require("../models/Expense");
const Reminder = require("../models/Reminder");
const { asyncHandler } = require("../middleware/errorHandler");

const getSummary = asyncHandler(async (req, res) => {
  /*
  =========================================================
  AUTHENTICATED USER
  =========================================================
  */

  if (!req.user?._id) {
    return res.status(401).json({
      message: "Authentication required.",
    });
  }

  const userId = req.user._id;

  const now = new Date();

  const startOfThisMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  );

  const startOfLastMonth = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1
  );

  /*
  =========================================================
  IMPORTANT
  =========================================================

  Every Expense query MUST belong to the logged-in user.

  Every Reminder query MUST belong to the logged-in user.

  Assuming both models have:
    user: ObjectId -> User
  =========================================================
  */

  const userExpenseFilter = {
    user: userId,
  };

  const userReminderFilter = {
    user: userId,
  };

  const [
    thisMonthAgg,
    lastMonthAgg,
    byRecipient,
    byMode,
    pendingCount,
    overdueCount,
  ] = await Promise.all([
    /*
    =======================================================
    THIS MONTH EXPENSES
    =======================================================
    */

    Expense.aggregate([
      {
        $match: {
          ...userExpenseFilter,
          date: {
            $gte: startOfThisMonth,
          },
        },
      },
      {
        $group: {
          _id: null,
          sum: {
            $sum: "$amount",
          },
          count: {
            $sum: 1,
          },
        },
      },
    ]),

    /*
    =======================================================
    LAST MONTH EXPENSES
    =======================================================
    */

    Expense.aggregate([
      {
        $match: {
          ...userExpenseFilter,
          date: {
            $gte: startOfLastMonth,
            $lt: startOfThisMonth,
          },
        },
      },
      {
        $group: {
          _id: null,
          sum: {
            $sum: "$amount",
          },
        },
      },
    ]),

    /*
    =======================================================
    TOP RECIPIENTS
    =======================================================
    */

    Expense.aggregate([
      {
        $match: {
          ...userExpenseFilter,
          date: {
            $gte: startOfThisMonth,
          },
        },
      },
      {
        $group: {
          _id: "$recipientName",
          sum: {
            $sum: "$amount",
          },
        },
      },
      {
        $sort: {
          sum: -1,
        },
      },
      {
        $limit: 5,
      },
    ]),

    /*
    =======================================================
    EXPENSE BY MODE
    =======================================================
    */

    Expense.aggregate([
      {
        $match: {
          ...userExpenseFilter,
          date: {
            $gte: startOfThisMonth,
          },
        },
      },
      {
        $group: {
          _id: "$mode",
          sum: {
            $sum: "$amount",
          },
        },
      },
    ]),

    /*
    =======================================================
    PENDING REMINDERS
    =======================================================
    */

    Reminder.countDocuments({
      ...userReminderFilter,
      status: "pending",
    }),

    /*
    =======================================================
    OVERDUE REMINDERS
    =======================================================
    */

    Reminder.countDocuments({
      ...userReminderFilter,
      status: "pending",
      dueDate: {
        $lt: now,
      },
    }),
  ]);

  /*
  =========================================================
  RESPONSE
  =========================================================
  */

  return res.json({
    thisMonthTotal: thisMonthAgg[0]?.sum || 0,

    thisMonthCount: thisMonthAgg[0]?.count || 0,

    lastMonthTotal: lastMonthAgg[0]?.sum || 0,

    topRecipients: byRecipient.map((item) => ({
      name: item._id,
      total: item.sum,
    })),

    byMode: byMode.map((item) => ({
      mode: item._id,
      total: item.sum,
    })),

    pendingReminders: pendingCount,

    overdueReminders: overdueCount,
  });
});

module.exports = {
  getSummary,
};