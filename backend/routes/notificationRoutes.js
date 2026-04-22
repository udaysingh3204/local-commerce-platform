const express = require("express");
const router = express.Router();

const {
	getMyNotifications,
	getNotifications,
	registerPushToken,
	clearPushToken,
	markAllRead,
	markOneRead,
} = require("../controllers/notificationController");
const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getMyNotifications);
router.patch("/mark-all-read", protect, markAllRead);
router.patch("/:notificationId/read", protect, markOneRead);
router.put("/push-token", protect, registerPushToken);
router.delete("/push-token", protect, clearPushToken);
router.get("/:userId", getNotifications);

module.exports = router;
