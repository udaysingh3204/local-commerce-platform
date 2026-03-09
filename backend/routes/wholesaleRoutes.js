const express = require("express");
const router = express.Router();

const {
  createWholesaleProduct,
  createWholesaleOrder,
  getSupplierOrders
} = require("../controllers/wholesaleController");

router.post("/product/create", createWholesaleProduct);

router.post("/order/create", createWholesaleOrder);

router.get("/orders/:supplierId", getSupplierOrders);

module.exports = router;