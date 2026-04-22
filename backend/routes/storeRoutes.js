const express = require("express");
const router = express.Router();

const {
  createStore,
  getStores,
  getStoreById,
  getVendorStores,
  getNearbyStores
} = require("../controllers/storeController");

router.post("/", createStore);
router.get("/", getStores);
router.get("/vendor/:vendorId", getVendorStores);
router.get("/nearby", getNearbyStores);
router.get("/:storeId", getStoreById);
module.exports = router;