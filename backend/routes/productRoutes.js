const express = require("express");
const router = express.Router();

const {
  createProduct,
  getProductsByStore
} = require("../controllers/productController");

router.post("/create", createProduct);

router.get("/store/:storeId", getProductsByStore);

module.exports = router;