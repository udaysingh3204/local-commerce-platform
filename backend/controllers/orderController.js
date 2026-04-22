const Order = require("../models/Order");
const Product = require("../models/Product");
const Notification = require("../models/Notification");
const Store = require("../models/Store");
const Driver = require("../models/Driver");
const { getDistance } = require("geolib");
const emailService = require("../services/emailService");
const logger = require("../config/logger");
const {
  TRACKING_SIGNAL_STALE_AFTER_MINUTES,
  TRACKING_DELAY_RISK_AFTER_MINUTES,
  TRACKING_DELAY_LATE_AFTER_MINUTES,
} = require("../config/appCapabilities")

const { assignNearestDriver, getRankedDriversForOrder } = require("../services/dispatchService");
const { getRouteMetrics } = require("../services/routingService");
const { sendPush } = require("../services/pushService");

const PUSH_MESSAGES = {
  accepted:         { title: "Order Confirmed ✅", body: "Your order has been accepted and is being prepared." },
  preparing:        { title: "Preparing Your Order 🍳", body: "The store is now preparing your items." },
  ready:            { title: "Order Ready 📦", body: "Your order is packed and ready for pickup by the driver." },
  out_for_delivery: { title: "Out for Delivery 🛵", body: "Your order is on its way! Track it in the app." },
  delivered:        { title: "Delivered 🎉", body: "Your order has been delivered. Enjoy!" },
  cancelled:        { title: "Order Cancelled ❌", body: "Your order was cancelled. Check the app for details." },
};

const isValidPoint = (point) => (
  point &&
  typeof point.lat === "number" &&
  typeof point.lng === "number"
)

const toDriverLocation = (driver) => {
  const coordinates = driver?.location?.coordinates

  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    return null
  }

  const [lng, lat] = coordinates

  if (typeof lat !== "number" || typeof lng !== "number") {
    return null
  }

  if (lat === 0 && lng === 0) {
    return null
  }

  return { lat, lng }
}

const getLocalRouteMetrics = ({ from, to }) => {
  if (!isValidPoint(from) || !isValidPoint(to)) {
    return null
  }

  const distanceMeters = getDistance(
    { latitude: from.lat, longitude: from.lng },
    { latitude: to.lat, longitude: to.lng }
  )

  const distanceKm = Number((distanceMeters / 1000).toFixed(2))
  const eta = Math.max(1, Math.ceil((distanceKm / 25) * 60))

  return {
    distanceKm,
    eta,
    routePath: [
      [from.lat, from.lng],
      [to.lat, to.lng],
    ],
    source: "local",
  }
}

const getTrackingSignalState = (order) => {
  if (order.status !== "out_for_delivery") {
    return {
      signalStatus: "idle",
      signalAgeMinutes: null,
    }
  }

  if (!order.deliveryLocationUpdatedAt) {
    return {
      signalStatus: "missing",
      signalAgeMinutes: null,
    }
  }

  const signalAgeMinutes = Math.max(0, Math.round((Date.now() - new Date(order.deliveryLocationUpdatedAt).getTime()) / 60000))

  return {
    signalStatus: signalAgeMinutes >= TRACKING_SIGNAL_STALE_AFTER_MINUTES ? "stale" : "live",
    signalAgeMinutes,
  }
}

const getDelayState = (order) => {
  if (order.status !== "out_for_delivery" || !order.deliveryStartTime || typeof order.estimatedDeliveryTime !== "number") {
    return {
      delayStatus: "unknown",
      delayMinutes: null,
      isDelayed: false,
    }
  }

  const expectedAt = new Date(order.deliveryStartTime).getTime() + (order.estimatedDeliveryTime * 60000)
  const delayMinutes = Math.max(0, Math.ceil((Date.now() - expectedAt) / 60000))

  if (delayMinutes >= TRACKING_DELAY_LATE_AFTER_MINUTES) {
    return {
      delayStatus: "delayed",
      delayMinutes,
      isDelayed: true,
    }
  }

  if (delayMinutes >= TRACKING_DELAY_RISK_AFTER_MINUTES) {
    return {
      delayStatus: "risk",
      delayMinutes,
      isDelayed: false,
    }
  }

  return {
    delayStatus: "on_time",
    delayMinutes: 0,
    isDelayed: false,
  }
}

/* ================= CREATE ORDER ================= */

exports.createOrder = async (req, res) => {
  try {
    console.log("🔥 Order API HIT");

    const { items, storeId, promotion } = req.body;

    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${product.name}`
        });
      }

      product.stock -= item.quantity;
      await product.save();

      orderItems.push({
        productId: product._id,
        name: product.name,
        image: product.image,
        quantity: item.quantity,
        price: product.price
      });
    }

    const store = await Store.findById(storeId);

    const subtotalAmount = orderItems.reduce(
      (sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 0)),
      0
    );

    const requestedTotalAmount = Number(req.body.totalAmount);
    const normalizedRequestedTotal = Number.isFinite(requestedTotalAmount)
      ? Math.max(0, requestedTotalAmount)
      : subtotalAmount;

    const inferredDiscount = Math.max(0, subtotalAmount - normalizedRequestedTotal);
    const promotionDiscount = Math.max(0, Number(promotion?.discountAmount || 0));
    const discountAmount = Math.min(subtotalAmount, Math.max(inferredDiscount, promotionDiscount));
    const finalAmount = Math.max(0, subtotalAmount - discountAmount);

    const promotionAudit = promotion?.campaignId
      ? {
          campaignId: String(promotion.campaignId),
          couponCode: promotion.code ? String(promotion.code) : null,
          campaignName: promotion.name ? String(promotion.name) : null,
          discountAmount,
          appliedAt: new Date(),
        }
      : undefined;

    let storeLocation;
    if (store?.location?.coordinates) {
      storeLocation = {
        type: "Point",
        coordinates: store.location.coordinates
      };
    }

    const order = await Order.create({
      ...req.body,
      items: orderItems,
      totalAmount: finalAmount,
      pricingBreakdown: {
        subtotalAmount,
        discountAmount,
        finalAmount,
      },
      promotionAudit,
      storeLocation
    });

    // 🚚 Assign driver
    const assignment = await assignNearestDriver(order);

    if (assignment) {
      order.deliveryPartnerId = assignment.driver._id;
      order.estimatedDeliveryTime = assignment.eta;
      order.deliveryLocation = toDriverLocation(assignment.driver) || order.deliveryLocation;
      if (order.deliveryLocation) {
        order.deliveryLocationUpdatedAt = new Date();
      }
      await order.save();

      await Driver.findByIdAndUpdate(
        assignment.driver._id,
        { isAvailable: false }
      );

      const io = req.app.get("io");

      io.emit("deliveryAssigned", {
        orderId: order._id,
        driverId: assignment.driver._id,
        eta: assignment.eta
      });
    }

    // 🔥 Emit new order for dashboard
    const io = req.app.get("io");
    io.emit("newOrder", order);

    // ── Order confirmation email ───────────────────────────────────────────
    if (order.customerId) {
      const User = require("../models/User");
      User.findById(order.customerId).select("email name").lean()
        .then((buyer) => {
          if (buyer?.email) {
            emailService.sendOrderConfirmation(order, buyer).catch(() => {})
          }
        })
        .catch(() => {})
    }

    res.status(201).json({
      message: "Order placed successfully",
      order
    });

  } catch (error) {
    logger.error("❌ ORDER ERROR:", { error: error.message });
    res.status(500).json({ error: error.message });
  }
};

/* ================= GET ALL ORDERS ================= */

exports.getAllOrders = async (req, res) => {
  try {

    const { driverId } = req.query
    const includeCompleted = req.query.includeCompleted === "true"

    let orders

    if (driverId) {
      const driverQuery = {
        deliveryPartnerId: driverId,
      }

      if (!includeCompleted) {
        driverQuery.status = { $nin: ["delivered", "cancelled"] }
      }

      orders = await Order.find(driverQuery).sort({ createdAt: -1 })
    } else {
      orders = await Order.find({
        status: { $in: ["pending", "accepted", "preparing"] },
        $or: [
          { deliveryPartnerId: { $exists: false } },
          { deliveryPartnerId: null }
        ]
      }).sort({ createdAt: -1 })
    }

    res.json(orders)

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

/* ================= DISPATCH RECOMMENDATIONS ================= */

exports.getDispatchRecommendations = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 5, 10)

    const candidateOrders = await Order.find({
      status: { $in: ["pending", "accepted", "preparing"] },
      $or: [
        { deliveryPartnerId: { $exists: false } },
        { deliveryPartnerId: null }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()

    const recommendations = await Promise.all(candidateOrders.map(async (order) => {
      const rankedDrivers = await getRankedDriversForOrder(order, { limit: 3 })

      return {
        orderId: String(order._id),
        status: order.status,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
        itemCount: order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0,
        candidates: rankedDrivers.map((entry) => ({
          driverId: String(entry.driver._id),
          driverName: entry.driver.name,
          driverEmail: entry.driver.email,
          distanceKm: entry.distanceKm,
          eta: entry.eta,
          activeOrders: entry.activeOrders,
          score: entry.score,
          source: entry.source,
          routePath: entry.routePath,
        })),
      }
    }))

    res.json(recommendations.filter((entry) => entry.candidates.length > 0))
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

/* ================= GET STORE ORDERS ================= */

exports.getOrdersByStore = async (req, res) => {
  try {
    const orders = await Order.find({
      storeId: req.params.storeId
    }).sort({ createdAt: -1 });

    res.json(orders);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ================= GET CUSTOMER ORDERS ================= */

exports.getOrdersByCustomer = async (req, res) => {
  try {
    const orders = await Order.find({
      customerId: req.params.customerId
    }).sort({ createdAt: -1 });

    res.json(orders);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ================= GET ORDER TRACKING ================= */

exports.getOrderTracking = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("deliveryPartnerId", "name email avatar isAvailable location")
      .lean()

    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    const customerLocation = isValidPoint(order.customerLocation) ? order.customerLocation : null
    const persistedDeliveryLocation = isValidPoint(order.deliveryLocation) ? order.deliveryLocation : null
    const liveDriverLocation = toDriverLocation(order.deliveryPartnerId)
    const deliveryLocation = persistedDeliveryLocation || liveDriverLocation
    const signalState = getTrackingSignalState(order)
    const delayState = getDelayState(order)

    let route = null

    if (deliveryLocation && customerLocation) {
      try {
        route = await getRouteMetrics({
          from: deliveryLocation,
          to: customerLocation,
        })
      } catch (error) {
        route = null
      }

      if (!route) {
        route = getLocalRouteMetrics({
          from: deliveryLocation,
          to: customerLocation,
        })
      }
    }

    res.json({
      orderId: String(order._id),
      status: order.status,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      estimatedDeliveryTime: route?.eta ?? order.estimatedDeliveryTime ?? null,
      distanceKm: route?.distanceKm ?? null,
      routePath: route?.routePath ?? [],
      routeSource: route?.source ?? null,
      customerLocation,
      deliveryLocation,
      deliveryStartTime: order.deliveryStartTime || null,
      lastLocationUpdateAt: order.deliveryLocationUpdatedAt || null,
      signalStatus: signalState.signalStatus,
      signalAgeMinutes: signalState.signalAgeMinutes,
      delayStatus: delayState.delayStatus,
      delayMinutes: delayState.delayMinutes,
      isDelayed: delayState.isDelayed,
      deliveryAddress: order.deliveryAddress || null,
      driver: order.deliveryPartnerId ? {
        _id: String(order.deliveryPartnerId._id),
        name: order.deliveryPartnerId.name,
        email: order.deliveryPartnerId.email,
        avatar: order.deliveryPartnerId.avatar,
        isAvailable: order.deliveryPartnerId.isAvailable,
      } : null,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

/* ================= UPDATE STATUS ================= */

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, driverId, estimatedDeliveryTime } = req.body;
    const existingOrder = await Order.findById(req.params.id);

    if (!existingOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    const update = { status };

    if (driverId) {
      update.deliveryPartnerId = driverId;

      const assignedDriver = await Driver.findById(driverId).select("location")
      const driverLocation = toDriverLocation(assignedDriver)

      if (driverLocation) {
        update.deliveryLocation = driverLocation
        update.deliveryLocationUpdatedAt = new Date()
      }
    }

    if (status === "out_for_delivery" && !existingOrder.deliveryStartTime) {
      update.deliveryStartTime = new Date();
    }

    if (typeof estimatedDeliveryTime === "number") {
      update.estimatedDeliveryTime = estimatedDeliveryTime;
    }

    if (status === "delivered") {
      if (!existingOrder.deliveryStartTime) {
        update.deliveryStartTime = existingOrder.updatedAt || new Date();
      }
      update.deliveryEndTime = new Date();
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      update,
      { returnDocument: "after" } // ✅ FIXED
    );

    const previousDriverId = existingOrder.deliveryPartnerId
      ? String(existingOrder.deliveryPartnerId)
      : null;

    if (driverId && previousDriverId && previousDriverId !== driverId) {
      await Driver.findByIdAndUpdate(previousDriverId, { isAvailable: true });
    }

    if (["accepted", "out_for_delivery"].includes(status) && driverId) {
      await Driver.findByIdAndUpdate(driverId, { isAvailable: false });
    }

    if (["delivered", "cancelled"].includes(status) && order.deliveryPartnerId) {
      await Driver.findByIdAndUpdate(order.deliveryPartnerId, { isAvailable: true });
    }

    const io = req.app.get("io");

    io.emit("orderStatusUpdated", {
      orderId: order._id,
      status: order.status
    });

    if (driverId && (!previousDriverId || previousDriverId !== driverId || status === "accepted" || status === "out_for_delivery")) {
      io.emit("deliveryAssigned", {
        orderId: order._id,
        driverId,
        eta: order.estimatedDeliveryTime || null
      });
    }

    if (status === "accepted") {
      io.emit("orderAccepted", {
        orderId: order._id,
        driverId: order.deliveryPartnerId
      });
    }

    res.json(order);

    // ── Push notification ──────────────────────────────────────────────────
    const pushMsg = PUSH_MESSAGES[status];
    if (pushMsg && order.userId) {
      const User = require("../models/User");
      const buyer = await User.findById(order.userId).select("expoPushToken").lean();
      if (buyer?.expoPushToken) {
        sendPush(buyer.expoPushToken, {
          ...pushMsg,
          data: { orderId: String(order._id), status },
        }).catch(() => {/* fire-and-forget */});
      }
    }

    // ── Transactional emails ───────────────────────────────────────────────
    if (["out_for_delivery", "delivered"].includes(status) && order.customerId) {
      const User = require("../models/User");
      User.findById(order.customerId).select("email name").lean()
        .then(async (buyer) => {
          if (!buyer?.email) return
          if (status === "out_for_delivery") {
            const driver = order.deliveryPartnerId
              ? await Driver.findById(order.deliveryPartnerId).select("name").lean()
              : null
            emailService.sendOrderDispatched(order, buyer, driver).catch(() => {})
          }
          if (status === "delivered") {
            emailService.sendOrderDelivered(order, buyer).catch(() => {})
          }
        })
        .catch(() => {})
    }

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};