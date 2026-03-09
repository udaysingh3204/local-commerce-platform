const express = require("express");
const router = express.Router();

const { getStoreAnalytics } = require("../controllers/analyticsController");

router.get("/store/:storeId", getStoreAnalytics);

module.exports = router;