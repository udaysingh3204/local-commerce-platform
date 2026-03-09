const express = require("express");
const router = express.Router();

const {
  createStore,
  getStores,
  getVendorStores,
  getNearbyStores
} = require("../controllers/storeController");

router.post("/create", createStore);
router.get("/", getStores);
router.get("/vendor/:vendorId", getVendorStores);
router.get("/nearby", getNearbyStores);
module.exports = router;