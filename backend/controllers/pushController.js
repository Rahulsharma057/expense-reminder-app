const PushSubscription = require("../models/PushSubscription");
const { asyncHandler } = require("../middleware/errorHandler");

const getVapidPublicKey = (req, res) => {
  res.json({
    publicKey: process.env.VAPID_PUBLIC_KEY,
  });
};

const subscribe = asyncHandler(async (req, res) => {
  const { endpoint, keys } = req.body;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({
      message: "Invalid push subscription.",
    });
  }

  await PushSubscription.findOneAndUpdate(
    {
      endpoint,
      user: req.user._id,
    },
    {
      user: req.user._id,
      endpoint,
      keys,
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );

  res.status(201).json({
    message: "Subscribed to notifications.",
  });
});

const unsubscribe = asyncHandler(async (req, res) => {
  const { endpoint } = req.body;

  if (endpoint) {
    await PushSubscription.deleteOne({
      endpoint,
      user: req.user._id,
    });
  }

  res.json({
    message: "Unsubscribed.",
  });
});

module.exports = {
  getVapidPublicKey,
  subscribe,
  unsubscribe,
};