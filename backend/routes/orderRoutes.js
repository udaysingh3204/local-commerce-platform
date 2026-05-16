const express = require("express");
const router = express.Router();
const { validateBody, schemas } = require("../middleware/validate");
const { protect } = require("../middleware/authMiddleware");

const Order = require("../models/Order");

const {
  createOrder,
  getOrdersByStore,
  getOrdersByCustomer,
  getOrderTracking,
  updateOrderStatus,
  getAllOrders,
  getDispatchRecommendations
} = require("../controllers/orderController");

/* CREATE ORDER */
router.post("/", protect, validateBody(schemas.createOrder), createOrder);

/* STORE ORDERS */
router.get("/store/:storeId", protect, getOrdersByStore);

/* CUSTOMER ORDERS */
router.get("/customer/:customerId", protect, getOrdersByCustomer);

/* GET ALL ORDERS (DRIVER DASHBOARD) */
router.get("/", protect, getAllOrders);

/* GET ALL ORDERS (ADMIN - unfiltered) */
router.get("/all", protect, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

/* GET RANKED DISPATCH RECOMMENDATIONS (ADMIN) */
router.get("/dispatch/recommendations", protect, getDispatchRecommendations);

/* GET LIVE TRACKING PAYLOAD */
router.get("/:id/tracking", protect, getOrderTracking);

/* UPDATE ORDER STATUS */
router.patch("/:id/status", protect, updateOrderStatus);

/* CANCEL ORDER */
router.patch("/:id/cancel", protect, async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const cancellable = ["pending", "accepted"];
    if (!cancellable.includes(order.status)) {
      return res.status(400).json({ message: `Cannot cancel an order with status: ${order.status}` });
    }

    order.status = "cancelled";
    if (reason) order.cancellationReason = reason;
    await order.save();

    const io = req.app.get("io");
    io.emit("orderStatusUpdated", { orderId: order._id, status: "cancelled" });

    // Free up driver if assigned
    if (order.deliveryPartnerId) {
      const Driver = require("../models/Driver");
      await Driver.findByIdAndUpdate(order.deliveryPartnerId, { isAvailable: true });
    }

    res.json({ message: "Order cancelled", order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;