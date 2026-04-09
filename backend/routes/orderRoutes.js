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

/* GET ALL ORDERS (ADMIN - unfiltered) */
router.get("/all", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* UPDATE ORDER STATUS */
router.patch("/:id/status", updateOrderStatus);

module.exports = router;