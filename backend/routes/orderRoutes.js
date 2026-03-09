const express = require("express");
const router = express.Router();

const {
  createOrder,
  getOrdersByStore,
  getOrdersByCustomer,
  updateOrderStatus
} = require("../controllers/orderController");

router.post("/create", createOrder);

router.get("/store/:storeId", getOrdersByStore);

router.get("/customer/:customerId", getOrdersByCustomer);
router.patch("/status", updateOrderStatus);
module.exports = router;