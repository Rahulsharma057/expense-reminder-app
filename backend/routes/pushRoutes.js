const express = require("express");
const router = express.Router();

const { getPublicKey, subscribe, unsubscribe } = require("../controllers/pushController");
const { protect } = require("../middleware/auth");

// Public key needs no auth — it's not a secret, the frontend needs it
// before the user necessarily has a fresh token in some flows.
router.get("/public-key", getPublicKey);

router.use(protect);

router.post("/subscribe", subscribe);
router.post("/unsubscribe", unsubscribe);

module.exports = router;