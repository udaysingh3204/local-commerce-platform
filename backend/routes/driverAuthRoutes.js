const express = require("express");
const router = express.Router();
const Driver = require("../models/Driver");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

/* REGISTER */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existing = await Driver.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Driver already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const driver = await Driver.create({ name, email, password: hashed });

    res.status(201).json({
      message: "Driver registered successfully",
      driver: { _id: driver._id, name: driver.name, email: driver.email }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* LOGIN */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const driver = await Driver.findOne({ email });
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const isMatch = await bcrypt.compare(password, driver.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: driver._id, role: "driver" },
      process.env.JWT_SECRET || "fallback_secret",
      { expiresIn: "7d" }
    );

    res.json({
      token,
      driver: { _id: driver._id, name: driver.name, email: driver.email, isAvailable: driver.isAvailable }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* GET ALL DRIVERS (admin) */
router.get("/all", async (req, res) => {
  try {
    const drivers = await Driver.find().select("-password").sort({ createdAt: -1 });
    res.json(drivers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;