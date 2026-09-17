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

  /*
  =========================================================
  DATE RANGE
  =========================================================
  */

  const now = new Date();

  // Start of current month
  const startOfThisMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
    0,
    0,
    0,
    0
  );

  // Start of previous month
  const startOfLastMonth = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1,
    0,
    0,
    0,
    0
  );

  /*
  =========================================================
  IMPORTANT
  =========================================================

  Expense model DOES NOT have "user".

  Expense model has:
    createdBy: ObjectId -> User

  So every Expense query must use:
    createdBy: userId

  Reminder is kept on "user" because your current
  Reminder controller/model is expected to use user.
  =========================================================
  */

  const userExpenseFilter = {
    createdBy: userId,
  };

  const userReminderFilter = {
    user: userId,
  };

  /*
  =========================================================
  RUN ALL QUERIES
  =========================================================
  */

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

          recipientName: {
            $exists: true,
            $ne: "",
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
    EXPENSE BY PAYMENT MODE
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

      {
        $sort: {
          sum: -1,
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
  RESPONSE VALUES
  =========================================================
  */

  const thisMonthTotal =
    thisMonthAgg[0]?.sum || 0;

  const thisMonthCount =
    thisMonthAgg[0]?.count || 0;

  const lastMonthTotal =
    lastMonthAgg[0]?.sum || 0;

  /*
  =========================================================
  SEND RESPONSE
  =========================================================
  */

  return res.status(200).json({
    thisMonthTotal,

    thisMonthCount,

    lastMonthTotal,

    topRecipients: byRecipient.map(
      (item) => ({
        name: item._id || "Unknown",
        total: item.sum || 0,
      })
    ),

    byMode: byMode.map(
      (item) => ({
        mode: item._id || "Other",
        total: item.sum || 0,
      })
    ),

    pendingReminders: pendingCount || 0,

    overdueReminders: overdueCount || 0,
  });
});

module.exports = {
  getSummary,
};