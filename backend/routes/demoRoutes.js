const express = require("express");

const { protect } = require("../middleware/authMiddleware");
const { checkRole } = require("../middleware/roleMiddleware");
const {
  getStatus,
  seedFull,
  seedOperations,
  seedGrowth,
  seedWholesale,
} = require("../controllers/demoController");

const router = express.Router();

router.get("/status", protect, checkRole("admin"), getStatus);
router.post("/seed/full", protect, checkRole("admin"), seedFull);
router.post("/seed/operations", protect, checkRole("admin"), seedOperations);
router.post("/seed/growth", protect, checkRole("admin"), seedGrowth);
router.post("/seed/wholesale", protect, checkRole("admin"), seedWholesale);

module.exports = router;