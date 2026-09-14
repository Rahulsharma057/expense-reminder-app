const https = require("https");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");

const Expense = require("../models/Expense");
const Recipient = require("../models/Recipient");
const { cloudinary } = require("../config/cloudinary");
const { asyncHandler } = require("../middleware/errorHandler");

const MAX_PHOTOS = 5;

/*
=============================================================
HELPER
=============================================================
*/

const getUserId = (req) => {
  return req.user?._id;
};

const getExpenseFilter = (req) => {
  return {
    createdBy: getUserId(req),
  };
};

/*
=============================================================
AUTO-SAVE RECIPIENT
=============================================================

Recipient is also linked to the logged-in user.

IMPORTANT:
Same recipient name can exist for different users.
=============================================================
*/

const upsertRecipient = async (name, userId) => {
  if (!name?.trim() || !userId) return;

  try {
    const nameLower = name.trim().toLowerCase();

    await Recipient.findOneAndUpdate(
      {
        nameLower,
        createdBy: userId,
      },
      {
        $setOnInsert: {
          name: name.trim(),
          nameLower,
          createdBy: userId,
        },
      },
      {
        upsert: true,
      }
    );
  } catch {
    // Non-critical.
  }
};

/*
=============================================================
CREATE EXPENSE
=============================================================
*/

const createExpense = asyncHandler(async (req, res) => {
  const {
    recipientName,
    amount,
    transactionId,
    date,
    reason,
    description,
    remarks,
    mode,
    paidByOther,
  } = req.body;

  if (!recipientName?.trim()) {
    return res.status(400).json({
      message: "Recipient name is required.",
    });
  }

  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({
      message: "Enter a valid amount.",
    });
  }

  const files = req.files || [];

  if (files.length > MAX_PHOTOS) {
    return res.status(400).json({
      message: `You can attach at most ${MAX_PHOTOS} photos.`,
    });
  }

  const expense = await Expense.create({
    recipientName: recipientName.trim(),

    amount: Number(amount),

    transactionId: transactionId?.trim() || "",

    date: date ? new Date(date) : new Date(),

    reason: reason?.trim() || "",

    description: description || "",

    remarks: remarks || "",

    mode: mode || "Cash",

    paidByOther:
      mode === "Other"
        ? paidByOther?.trim() || ""
        : "",

    billPhotos: files.map((file) => ({
      url: file.path,
      publicId: file.filename,
    })),

    /*
     * VERY IMPORTANT
     * Expense belongs to currently logged-in user.
     */
    createdBy: req.user._id,
  });

  await upsertRecipient(
    recipientName,
    req.user._id
  );

  return res.status(201).json(expense);
});

/*
=============================================================
LIST EXPENSES
=============================================================

Only current user's expenses.
=============================================================
*/

const listExpenses = asyncHandler(async (req, res) => {
  const {
    search,
    mode,
    from,
    to,
    page = 1,
    limit = 20,
  } = req.query;

  /*
   * IMPORTANT:
   * Never start with {}
   */
  const filter = {
    createdBy: req.user._id,
  };

  if (search?.trim()) {
    const regex = new RegExp(
      search.trim(),
      "i"
    );

    filter.$or = [
      {
        recipientName: regex,
      },
      {
        reason: regex,
      },
      {
        transactionId: regex,
      },
    ];
  }

  if (mode) {
    filter.mode = mode;
  }

  if (from || to) {
    filter.date = {};

    if (from) {
      filter.date.$gte = new Date(from);
    }

    if (to) {
      filter.date.$lte = new Date(
        `${to}T23:59:59`
      );
    }
  }

  const pageNum = Math.max(
    parseInt(page, 10) || 1,
    1
  );

  const limitNum = Math.min(
    Math.max(
      parseInt(limit, 10) || 20,
      1
    ),
    100
  );

  const skip =
    (pageNum - 1) * limitNum;

  const [
    expenses,
    total,
    totalAmountAgg,
  ] = await Promise.all([
    Expense.find(filter)
      .sort({
        date: -1,
        createdAt: -1,
      })
      .skip(skip)
      .limit(limitNum),

    Expense.countDocuments(filter),

    Expense.aggregate([
      {
        $match: filter,
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
  ]);

  return res.json({
    expenses,

    totalAmount:
      totalAmountAgg[0]?.sum || 0,

    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.max(
        Math.ceil(total / limitNum),
        1
      ),
    },
  });
});

/*
=============================================================
GET SINGLE EXPENSE
=============================================================

User can only open their own expense.
=============================================================
*/

const getExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({
    _id: req.params.id,
    createdBy: req.user._id,
  });

  if (!expense) {
    return res.status(404).json({
      message: "Expense not found.",
    });
  }

  return res.json(expense);
});

/*
=============================================================
UPDATE EXPENSE
=============================================================
*/

const updateExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({
    _id: req.params.id,
    createdBy: req.user._id,
  });

  if (!expense) {
    return res.status(404).json({
      message: "Expense not found.",
    });
  }

  const {
    recipientName,
    amount,
    transactionId,
    date,
    reason,
    description,
    remarks,
    mode,
    paidByOther,
    removedPhotoIds,
  } = req.body;

  if (recipientName !== undefined) {
    if (!recipientName?.trim()) {
      return res.status(400).json({
        message: "Recipient name is required.",
      });
    }

    expense.recipientName =
      recipientName.trim();
  }

  if (amount !== undefined) {
    if (Number(amount) <= 0) {
      return res.status(400).json({
        message: "Enter a valid amount.",
      });
    }

    expense.amount = Number(amount);
  }

  if (transactionId !== undefined) {
    expense.transactionId =
      transactionId.trim();
  }

  if (date !== undefined) {
    expense.date = new Date(date);
  }

  if (reason !== undefined) {
    expense.reason = reason.trim();
  }

  if (description !== undefined) {
    expense.description =
      description;
  }

  if (remarks !== undefined) {
    expense.remarks = remarks;
  }

  if (mode !== undefined) {
    expense.mode = mode;
  }

  expense.paidByOther =
    expense.mode === "Other"
      ? paidByOther?.trim() || ""
      : "";

  /*
  ===========================================================
  REMOVE PHOTOS
  ===========================================================
  */

  let idsToRemove = [];

  if (removedPhotoIds) {
    try {
      idsToRemove =
        JSON.parse(removedPhotoIds);

      if (!Array.isArray(idsToRemove)) {
        idsToRemove = [];
      }
    } catch {
      idsToRemove = [];
    }
  }

  if (idsToRemove.length) {
    await Promise.all(
      idsToRemove.map((publicId) =>
        cloudinary.uploader
          .destroy(publicId)
          .catch(() => {})
      )
    );

    expense.billPhotos =
      expense.billPhotos.filter(
        (photo) =>
          !idsToRemove.includes(
            photo.publicId
          )
      );
  }

  /*
  ===========================================================
  ADD NEW PHOTOS
  ===========================================================
  */

  const files = req.files || [];

  const newPhotos = files.map((file) => ({
    url: file.path,
    publicId: file.filename,
  }));

  if (
    expense.billPhotos.length +
      newPhotos.length >
    MAX_PHOTOS
  ) {
    return res.status(400).json({
      message: `You can attach at most ${MAX_PHOTOS} photos total.`,
    });
  }

  expense.billPhotos = [
    ...expense.billPhotos,
    ...newPhotos,
  ];

  await expense.save();

  if (recipientName !== undefined) {
    await upsertRecipient(
      recipientName,
      req.user._id
    );
  }

  return res.json(expense);
});

/*
=============================================================
DELETE EXPENSE
=============================================================
*/

const deleteExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({
    _id: req.params.id,
    createdBy: req.user._id,
  });

  if (!expense) {
    return res.status(404).json({
      message: "Expense not found.",
    });
  }

  /*
   * Delete Cloudinary photos.
   */
  if (expense.billPhotos?.length) {
    await Promise.all(
      expense.billPhotos.map((photo) =>
        cloudinary.uploader
          .destroy(photo.publicId)
          .catch(() => {})
      )
    );
  }

  await expense.deleteOne();

  return res.json({
    message: "Expense deleted.",
    id: req.params.id,
  });
});

/*
=============================================================
RECIPIENT SUGGESTIONS
=============================================================

Only recipients belonging to current user.
=============================================================
*/

const suggestRecipients = asyncHandler(
  async (req, res) => {
    const recipients =
      await Recipient.find({
        createdBy: req.user._id,
      })
        .sort({
          name: 1,
        })
        .limit(50);

    if (recipients.length) {
      return res.json(
        recipients.map(
          (recipient) => recipient.name
        )
      );
    }

    /*
     * Fallback for old expense data.
     * Still restricted to current user.
     */
    const names =
      await Expense.distinct(
        "recipientName",
        {
          createdBy: req.user._id,
        }
      );

    return res.json(
      names.slice(0, 50)
    );
  }
);

/*
=============================================================
EXCEL COLUMNS
=============================================================
*/

const ALL_COLUMNS = {
  date: {
    header: "Date",
    width: 14,
    value: (expense) =>
      new Date(
        expense.date
      ).toLocaleDateString("en-IN"),
  },

  recipientName: {
    header: "Recipient",
    width: 24,
    value: (expense) =>
      expense.recipientName,
  },

  amount: {
    header: "Amount (Rs.)",
    width: 14,
    value: (expense) =>
      expense.amount,
  },

  mode: {
    header: "Paid Via",
    width: 16,
    value: (expense) =>
      expense.mode,
  },

  paidByOther: {
    header: "Paid By (Other)",
    width: 20,
    value: (expense) =>
      expense.paidByOther || "",
  },

  transactionId: {
    header: "Transaction ID",
    width: 20,
    value: (expense) =>
      expense.transactionId || "",
  },

  reason: {
    header: "Reason",
    width: 22,
    value: (expense) =>
      expense.reason || "",
  },

  description: {
    header: "Description",
    width: 30,
    value: (expense) =>
      expense.description || "",
  },

  remarks: {
    header: "Remarks",
    width: 30,
    value: (expense) =>
      expense.remarks || "",
  },

  createdAt: {
    header: "Added On",
    width: 18,
    value: (expense) =>
      new Date(
        expense.createdAt
      ).toLocaleString("en-IN"),
  },
};

/*
=============================================================
EXCEL EXPORT
=============================================================
*/

const exportExcel = asyncHandler(
  async (req, res) => {
    const {
      from,
      to,
      columns,
    } = req.query;

    /*
     * Current user only.
     */
    const filter = {
      createdBy: req.user._id,
    };

    if (from || to) {
      filter.date = {};

      if (from) {
        filter.date.$gte =
          new Date(from);
      }

      if (to) {
        filter.date.$lte =
          new Date(
            `${to}T23:59:59`
          );
      }
    }

    const selectedKeys = (
      columns
        ? columns.split(",")
        : Object.keys(ALL_COLUMNS)
    )
      .map((key) => key.trim())
      .filter(
        (key) => ALL_COLUMNS[key]
      );

    const keys = selectedKeys.length
      ? selectedKeys
      : Object.keys(ALL_COLUMNS);

    const expenses =
      await Expense.find(filter)
        .sort({
          date: 1,
        });

    const workbook =
      new ExcelJS.Workbook();

    const sheet =
      workbook.addWorksheet(
        "Expenses"
      );

    sheet.columns = keys.map(
      (key) => ({
        header:
          ALL_COLUMNS[key].header,
        key,
        width:
          ALL_COLUMNS[key].width,
      })
    );

    sheet.getRow(1).font = {
      bold: true,
      color: {
        argb: "FFFFFFFF",
      },
    };

    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: {
        argb: "FF7C3AED",
      },
    };

    let total = 0;

    expenses.forEach((expense) => {
      const row = {};

      keys.forEach((key) => {
        row[key] =
          ALL_COLUMNS[key].value(
            expense
          );
      });

      sheet.addRow(row);

      total +=
        Number(expense.amount) || 0;
    });

    sheet.addRow({});

    const totalRow =
      sheet.addRow({
        [keys[0]]: "TOTAL",

        ...(keys.includes("amount")
          ? {
              amount: total,
            }
          : {}),
      });

    totalRow.font = {
      bold: true,
    };

    const filename =
      `expenses_${from || "all"}_to_${to || "all"}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );

    await workbook.xlsx.write(res);

    res.end();
  }
);

/*
=============================================================
DATE RANGE PDF REPORT
=============================================================
*/

const reportPdf = asyncHandler(
  async (req, res) => {
    const { from, to } =
      req.query;

    /*
     * Current user's expenses only.
     */
    const filter = {
      createdBy: req.user._id,
    };

    if (from || to) {
      filter.date = {};

      if (from) {
        filter.date.$gte =
          new Date(from);
      }

      if (to) {
        filter.date.$lte =
          new Date(
            `${to}T23:59:59`
          );
      }
    }

    const expenses =
      await Expense.find(filter)
        .sort({
          date: 1,
        });

    const total =
      expenses.reduce(
        (sum, expense) =>
          sum +
          Number(expense.amount),
        0
      );

    const doc = new PDFDocument({
      margin: 40,
      size: "A4",
    });

    const filename =
      `expense_report_${from || "all"}_to_${to || "all"}.pdf`;

    res.setHeader(
      "Content-Type",
      "application/pdf"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );

    doc.pipe(res);

    doc
      .fontSize(18)
      .fillColor("#5B21B6")
      .text("Expense Report", {
        align: "center",
      });

    doc.moveDown(0.3);

    doc
      .fontSize(10)
      .fillColor("#555")
      .text(
        `Period: ${
          from
            ? new Date(
                from
              ).toLocaleDateString(
                "en-IN"
              )
            : "Beginning"
        } - ${
          to
            ? new Date(
                to
              ).toLocaleDateString(
                "en-IN"
              )
            : "Today"
        }`,
        {
          align: "center",
        }
      );

    doc.moveDown(1);

    const tableTop =
      doc.y;

    const colX = {
      date: 40,
      recipient: 105,
      amount: 240,
      mode: 305,
      reason: 390,
    };

    doc
      .rect(
        40,
        tableTop,
        515,
        20
      )
      .fill("#7C3AED");

    doc
      .fillColor("#FFFFFF")
      .fontSize(9);

    doc.text(
      "Date",
      colX.date + 3,
      tableTop + 5
    );

    doc.text(
      "Recipient",
      colX.recipient + 3,
      tableTop + 5
    );

    doc.text(
      "Amount",
      colX.amount + 3,
      tableTop + 5
    );

    doc.text(
      "Mode",
      colX.mode + 3,
      tableTop + 5
    );

    doc.text(
      "Reason",
      colX.reason + 3,
      tableTop + 5
    );

    let y =
      tableTop + 24;

    expenses.forEach(
      (expense, index) => {
        if (y > 760) {
          doc.addPage();
          y = 40;
        }

        if (index % 2 === 0) {
          doc
            .rect(
              40,
              y - 3,
              515,
              18
            )
            .fill("#F5F3FF");
        }

        doc
          .fillColor("#222")
          .fontSize(8.5);

        doc.text(
          new Date(
            expense.date
          ).toLocaleDateString(
            "en-IN"
          ),
          colX.date + 3,
          y
        );

        doc.text(
          expense.recipientName,
          colX.recipient + 3,
          y,
          {
            width: 130,
          }
        );

        doc.text(
          `Rs. ${Number(
            expense.amount
          ).toLocaleString("en-IN")}`,
          colX.amount + 3,
          y
        );

        doc.text(
          expense.mode,
          colX.mode + 3,
          y
        );

        doc.text(
          expense.reason || "-",
          colX.reason + 3,
          y,
          {
            width: 120,
          }
        );

        y += 18;
      }
    );

    doc.moveDown(2);

    doc
      .moveTo(40, y + 5)
      .lineTo(555, y + 5)
      .stroke("#ccc");

    doc
      .fontSize(12)
      .fillColor("#5B21B6")
      .text(
        `Total: Rs. ${total.toLocaleString(
          "en-IN"
        )}`,
        40,
        y + 12,
        {
          align: "right",
          width: 515,
        }
      );

    doc.end();
  }
);

/*
=============================================================
FETCH IMAGE
=============================================================
*/

const fetchImageBuffer = (url) =>
  new Promise(
    (resolve, reject) => {
      https
        .get(url, (response) => {
          const chunks = [];

          response.on(
            "data",
            (chunk) =>
              chunks.push(chunk)
          );

          response.on(
            "end",
            () =>
              resolve(
                Buffer.concat(chunks)
              )
          );
        })
        .on("error", reject);
    }
  );

/*
=============================================================
SINGLE EXPENSE INVOICE PDF
=============================================================
*/

const invoicePdf = asyncHandler(
  async (req, res) => {
    const expense =
      await Expense.findOne({
        _id: req.params.id,
        createdBy: req.user._id,
      });

    if (!expense) {
      return res.status(404).json({
        message: "Expense not found.",
      });
    }

    const doc =
      new PDFDocument({
        margin: 40,
        size: "A4",
      });

    res.setHeader(
      "Content-Type",
      "application/pdf"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="invoice_${expense._id}.pdf"`
    );

    doc.pipe(res);

    doc
      .fontSize(20)
      .fillColor("#5B21B6")
      .text(
        "Expense Invoice",
        {
          align: "center",
        }
      );

    doc.moveDown(1);

    const rows = [
      [
        "Recipient",
        expense.recipientName,
      ],
      [
        "Amount",
        `Rs. ${Number(
          expense.amount
        ).toLocaleString("en-IN")}`,
      ],
      [
        "Date",
        new Date(
          expense.date
        ).toLocaleDateString(
          "en-IN"
        ),
      ],
      [
        "Paid Via",
        expense.mode === "Other"
          ? `Other (${
              expense.paidByOther ||
              "-"
            })`
          : expense.mode,
      ],
      [
        "Transaction ID",
        expense.transactionId ||
          "-",
      ],
      [
        "Reason",
        expense.reason || "-",
      ],
      [
        "Description",
        expense.description ||
          "-",
      ],
      [
        "Remarks",
        expense.remarks || "-",
      ],
    ];

    doc
      .fontSize(11)
      .fillColor("#222");

    rows.forEach(
      ([label, value]) => {
        doc
          .font("Helvetica-Bold")
          .text(
            `${label}: `,
            {
              continued: true,
            }
          );

        doc
          .font("Helvetica")
          .text(value);

        doc.moveDown(0.3);
      }
    );

    const photos =
      expense.billPhotos?.length
        ? expense.billPhotos
        : [];

    if (photos.length) {
      doc.moveDown(1);

      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .fillColor("#5B21B6")
        .text(
          "Attached Bill / Slip Photos"
        );

      doc.moveDown(0.5);

      for (const photo of photos) {
        try {
          const buffer =
            await fetchImageBuffer(
              photo.url
            );

          if (doc.y > 600) {
            doc.addPage();
          }

          doc.image(buffer, {
            fit: [250, 250],
            align: "center",
          });

          doc.moveDown(1);
        } catch {
          // Skip inaccessible photo.
        }
      }
    }

    doc.end();
  }
);

/*
=============================================================
CLAIM STATUS
=============================================================
*/

const updateClaimStatus =
  asyncHandler(
    async (req, res) => {
      const {
        claimStatus,
        expectedReturnDate,
        claimRemark,
      } = req.body;

      const expense =
        await Expense.findOne({
          _id: req.params.id,
          createdBy: req.user._id,
        });

      if (!expense) {
        return res.status(404).json({
          message:
            "Expense not found.",
        });
      }

      if (
        claimStatus !== undefined
      ) {
        expense.claimStatus =
          claimStatus;
      }

      if (
        expectedReturnDate !==
        undefined
      ) {
        expense.expectedReturnDate =
          expectedReturnDate
            ? new Date(
                expectedReturnDate
              )
            : null;
      }

      if (
        claimRemark !== undefined
      ) {
        expense.claimRemark =
          claimRemark;
      }

      await expense.save();

      return res.json(expense);
    }
  );

/*
=============================================================
BULK CLAIM STATUS
=============================================================
*/

const bulkUpdateClaimStatus =
  asyncHandler(
    async (req, res) => {
      const {
        ids,
        claimStatus,
      } = req.body;

      if (
        !Array.isArray(ids) ||
        !ids.length
      ) {
        return res.status(400).json({
          message:
            "No expenses selected.",
        });
      }

      if (!claimStatus) {
        return res.status(400).json({
          message:
            "Claim status is required.",
        });
      }

      /*
       * VERY IMPORTANT:
       * Only update selected expenses
       * belonging to current user.
       */
      const result =
        await Expense.updateMany(
          {
            _id: {
              $in: ids,
            },

            createdBy:
              req.user._id,
          },
          {
            $set: {
              claimStatus,
            },
          }
        );

      return res.json({
        message:
          "Claim status updated.",

        /*
         * Actual number updated,
         * not blindly ids.length.
         */
        updated:
          result.modifiedCount || 0,
      });
    }
  );

/*
=============================================================
EXPORTS
=============================================================
*/

module.exports = {
  createExpense,
  listExpenses,
  getExpense,
  updateExpense,
  deleteExpense,
  suggestRecipients,
  exportExcel,
  reportPdf,
  invoicePdf,
  updateClaimStatus,
  bulkUpdateClaimStatus,
};