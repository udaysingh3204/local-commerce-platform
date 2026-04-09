

const express = require("express");
const router = express.Router();

const { register, login } = require("../controllers/authController");
const User = require("../models/User");

router.post("/register", register);
router.post("/login", login);

/* GET ALL USERS (admin) */
router.get("/users", async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;