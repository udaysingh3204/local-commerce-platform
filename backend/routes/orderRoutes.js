const express = require("express");
const router = express.Router();

const {
  createOrder,
  getOrdersByStore,
  getOrdersByCustomer,
  updateOrderStatus
} = require("../controllers/orderController");

/* CREATE ORDER */
router.post("/", createOrder);

/* STORE ORDERS */
router.get("/store/:storeId", getOrdersByStore);

/* CUSTOMER ORDERS */
router.get("/customer/:customerId", getOrdersByCustomer);

/* UPDATE ORDER STATUS */
router.patch("/:id/status", updateOrderStatus);

module.exports = router;