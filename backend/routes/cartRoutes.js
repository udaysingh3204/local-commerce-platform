const express = require("express");
const router = express.Router();

const {
  addToCart,
  getCart
} = require("../controllers/cartController");

router.post("/add", addToCart);

router.get("/:customerId", getCart);

module.exports = router;