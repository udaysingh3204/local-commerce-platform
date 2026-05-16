

const express = require("express");
const router = express.Router();

const {
  register, login, googleLogin, me, bootstrap,
  refresh, logout, forgotPassword, resetPassword,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const { validateBody, schemas } = require("../middleware/validate");
const User = require("../models/User");

router.post("/register", validateBody(schemas.register), register);
router.post("/login", validateBody(schemas.login), login);
router.post("/google", googleLogin);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.post("/forgot-password", validateBody(schemas.forgotPassword), forgotPassword);
router.post("/reset-password", validateBody(schemas.resetPassword), resetPassword);
router.get("/me", protect, me);
router.get("/bootstrap", protect, bootstrap);

/* GET ALL USERS (admin) */
router.get("/users", protect, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
  try {
    const users = await User.find().select("-password -passwordResetToken").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
