const express = require("express");
const router = express.Router();

const { getNotifications } = require("../controllers/notificationController");

router.get("/:userId", getNotifications);

module.exports = router;