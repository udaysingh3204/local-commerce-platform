const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const checkRole = require("../middleware/roleMiddleware");

const { getStoreAnalytics, getDashboardAnalytics, exportCouponAnalyticsCsv, getWholesaleSlaAnalytics } = require("../controllers/analyticsController");

router.get("/dashboard", getDashboardAnalytics);
router.get("/coupons/export", exportCouponAnalyticsCsv);
router.get("/store/:storeId", getStoreAnalytics);
router.get("/wholesale/sla", protect, checkRole("admin"), getWholesaleSlaAnalytics);

module.exports = router;