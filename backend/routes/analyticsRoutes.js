const express = require("express");
const router = express.Router();

const { getStoreAnalytics, getDashboardAnalytics } = require("../controllers/analyticsController");

router.get("/dashboard", getDashboardAnalytics);
router.get("/store/:storeId", getStoreAnalytics);

module.exports = router;