const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const checkRole = require("../middleware/roleMiddleware");

const {
  createWholesaleProduct,
  createWholesaleOrder,
  getSupplierOrders,
  updateWholesaleOrderStatus,
  updateWholesaleOrderDetails,
  updateWholesaleFulfillment,
  updateWholesaleInvoice,
  getWholesaleOrderInvoice,
  getRetailerWholesaleOrders,
} = require("../controllers/wholesaleController");

router.post("/product/create", createWholesaleProduct);

router.post("/order/create", createWholesaleOrder);

// Retailer: view own wholesale orders
router.get("/my-orders", protect, checkRole("retailer", "admin"), getRetailerWholesaleOrders);

// Invoice view (retailer + supplier + admin)
router.get("/order/:orderId/invoice", protect, checkRole("retailer", "supplier", "admin"), getWholesaleOrderInvoice);

router.patch("/order/:orderId/details", protect, checkRole("supplier", "admin"), updateWholesaleOrderDetails);
router.patch("/order/:orderId/status", protect, checkRole("supplier", "admin"), updateWholesaleOrderStatus);
router.patch("/order/:orderId/fulfillment", protect, checkRole("supplier", "admin"), updateWholesaleFulfillment);
router.patch("/order/:orderId/invoice", protect, checkRole("supplier", "admin"), updateWholesaleInvoice);

router.get("/orders/:supplierId", protect, checkRole("supplier", "admin"), getSupplierOrders);

module.exports = router;