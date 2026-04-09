const Order = require("../models/Order");
const Product = require("../models/Product");
const Notification = require("../models/Notification");
const Store = require("../models/Store");
const Driver = require("../models/Driver");

const { assignNearestDriver } = require("../services/dispatchService");

/* ================= CREATE ORDER ================= */

exports.createOrder = async (req, res) => {
  try {
    console.log("🔥 Order API HIT");

    const { items, storeId } = req.body;

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
      storeLocation
    });

    // 🚚 Assign driver
    const assignment = await assignNearestDriver(order);

    if (assignment) {
      order.deliveryPartnerId = assignment.driver._id;
      order.estimatedDeliveryTime = assignment.eta;
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

    res.status(201).json({
      message: "Order placed successfully",
      order
    });

  } catch (error) {
    console.error("❌ ORDER ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

/* ================= GET ALL ORDERS ================= */

exports.getAllOrders = async (req, res) => {
  try {

    const { driverId } = req.query

    let orders

    if (driverId) {
      // 👇 only assigned orders
      orders = await Order.find({
        deliveryPartnerId: driverId,
        status: { $ne: "delivered" }
      })
    } else {
      // 👇 available orders
      orders = await Order.find({
        status: "pending",
        $or: [
          { deliveryPartnerId: { $exists: false } },
          { deliveryPartnerId: null }
        ]
      })
    }

    res.json(orders)

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

/* ================= UPDATE STATUS ================= */

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, driverId } = req.body;

    const update = { status };

    if (driverId) {
      update.deliveryPartnerId = driverId;
    }

    if (status === "out_for_delivery") {
      update.deliveryStartTime = new Date();
    }

    if (status === "delivered") {
      update.deliveryEndTime = new Date();
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      update,
      { returnDocument: "after" } // ✅ FIXED
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (status === "accepted" && driverId) {
      await Driver.findByIdAndUpdate(driverId, { isAvailable: false });
    }

    if (status === "delivered" && order.deliveryPartnerId) {
      await Driver.findByIdAndUpdate(order.deliveryPartnerId, { isAvailable: true });
    }

    const io = req.app.get("io");

    io.emit("orderStatusUpdated", {
      orderId: order._id,
      status: order.status
    });

    if (status === "accepted") {
      io.emit("orderAccepted", {
        orderId: order._id,
        driverId: order.deliveryPartnerId
      });
    }

    res.json(order);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};