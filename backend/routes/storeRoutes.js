const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

const {
  createStore,
  getStores,
  getStoreById,
  getVendorStores,
  getNearbyStores
} = require("../controllers/storeController");

router.post("/", protect, createStore);
router.get("/", getStores);
router.get("/vendor/:vendorId", getVendorStores);
router.get("/nearby", getNearbyStores);
router.get("/:storeId", getStoreById);
module.exports = router;