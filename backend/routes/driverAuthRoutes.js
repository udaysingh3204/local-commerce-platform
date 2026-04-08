const express = require("express");
const router = express.Router();
const Driver = require("../models/Driver");
const bcrypt = require("bcryptjs");

/* REGISTER */
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  const hashed = await bcrypt.hash(password, 10);

  const driver = await Driver.create({
    name,
    email,
    password: hashed
  });

  res.json(driver);
});

/* LOGIN */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const driver = await Driver.findOne({ email });

  if (!driver) {
    return res.status(404).json({ message: "Driver not found" });
  }

  const isMatch = await bcrypt.compare(password, driver.password);

  if (!isMatch) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  res.json(driver);
});

module.exports = router;