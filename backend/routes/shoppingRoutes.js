const express = require("express");
const router = express.Router();
const { createList, listLists, getList, updateList, deleteList, addItem, updateItem, deleteItem } = require("../controllers/shoppingController");
const { protect } = require("../middleware/auth");

router.use(protect);

router.get("/", listLists);
router.post("/", createList);

router.post("/:id/items", addItem);
router.patch("/:id/items/:itemId", updateItem);
router.delete("/:id/items/:itemId", deleteItem);

router.get("/:id", getList);
router.put("/:id", updateList);
router.delete("/:id", deleteList);

module.exports = router;