const express = require("express");
const router = express.Router();

const Order = require("../models/Order"); // ✅ add this

const {
  createOrder,
  getOrdersByStore,
  getOrdersByCustomer,
  updateOrderStatus,
  getAllOrders // ✅ add this
} = require("../controllers/orderController");

/* CREATE ORDER */
router.post("/", createOrder);

/* STORE ORDERS */
router.get("/store/:storeId", getOrdersByStore);

/* CUSTOMER ORDERS */
router.get("/customer/:customerId", getOrdersByCustomer);

/* GET ALL ORDERS (DRIVER DASHBOARD) */
router.get("/", getAllOrders); // ✅ use controller

/* UPDATE ORDER STATUS */
router.patch("/:id/status", updateOrderStatus);

module.exports = router;