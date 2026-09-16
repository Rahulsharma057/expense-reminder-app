const PushSubscription = require("../models/PushSubscription");

// GET /push/public-key — the frontend needs this to call
// pushManager.subscribe({ applicationServerKey: <this> }).
const getPublicKey = (req, res) => {
  if (!process.env.VAPID_PUBLIC_KEY) {
    return res.status(503).json({ message: "Push notifications are not configured on this server" });
  }
  return res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
};

// POST /push/subscribe   { endpoint, keys: { p256dh, auth } }
const subscribe = async (req, res) => {
  try {
    const { endpoint, keys } = req.body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ message: "Invalid subscription" });
    }

    await PushSubscription.findOneAndUpdate(
      { endpoint },
      { user: req.user._id, endpoint, keys },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error("push subscribe error:", err);
    return res.status(500).json({ message: "Could not save subscription" });
  }
};

// POST /push/unsubscribe   { endpoint }
const unsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ message: "endpoint required" });

    await PushSubscription.deleteOne({ endpoint, user: req.user._id });

    return res.json({ ok: true });
  } catch (err) {
    console.error("push unsubscribe error:", err);
    return res.status(500).json({ message: "Could not remove subscription" });
  }
};

module.exports = { getPublicKey, subscribe, unsubscribe };