const express = require("express");
const router = express.Router();
const deliveryController = require("../controllers/deliveryController");
const {
  registerDeliveryPartner,
  assignDelivery,
  getAssignedOrders,
  updateLocation,
  autoAssignDelivery
} = require("../controllers/deliveryController");

router.post("/register", registerDeliveryPartner);

router.post("/assign", assignDelivery);

router.get("/orders/:partnerId", getAssignedOrders);

router.post("/update-location", updateLocation);

router.post("/auto-assign", autoAssignDelivery);

router.post("/location", deliveryController.updateDriverLocation);
module.exports = router;