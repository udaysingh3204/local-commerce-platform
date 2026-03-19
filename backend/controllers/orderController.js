const Order = require("../models/Order");
const Product = require("../models/Product");
const Notification = require("../models/Notification");
const Store = require("../models/Store");

const { assignNearestDriver } = require("../services/dispatchService");
const orderQueue = require("../queues/orderQueue");

exports.createOrder = async (req, res) => {
  try {

    const { items, storeId } = req.body;

    const orderItems = [];

    /* CHECK PRODUCT STOCK */

    for (const item of items) {

      const product = await Product.findById(item.productId);

      if (!product) {
        return res.status(404).json({
          message: "Product not found"
        });
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

    /* 🔥 GET STORE LOCATION BEFORE ORDER CREATION */

    const store = await Store.findById(storeId);

    let storeLocation = undefined;

    if (store && store.location && store.location.coordinates) {
      storeLocation = {
        type: "Point",
        coordinates: store.location.coordinates
      };
    }

    /* 🔥 CREATE ORDER (WITH storeLocation) */

    const order = await Order.create({
      ...req.body,
      items: orderItems,
      storeLocation // ✅ FIXED HERE
    });

    /* QUEUE JOB */

    await orderQueue.add("new-order", {
      orderId: order._id.toString()
    });

    /* SMART DRIVER DISPATCH */

    const driver = await assignNearestDriver(order);

    if (driver) {
      order.deliveryPartnerId = driver._id;
      await order.save();

      req.app.get("io").emit("deliveryAssigned", {
        orderId: order._id,
        driverId: driver._id
      });
    }

    /* REALTIME EVENT */

    const io = req.app.get("io");

    io.emit("newOrder", order);

    /* VENDOR NOTIFICATION */

    await Notification.create({
      userId: order.storeId,
      message: `New order received: ${order._id}`,
      type: "order"
    });

    res.status(201).json({
      message: "Order placed successfully",
      order
    });

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};


/* GET ORDERS BY STORE */

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


/* GET ORDERS BY CUSTOMER */

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


/* UPDATE ORDER STATUS */

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    const io = req.app.get("io");

    io.to(order._id.toString()).emit("orderStatusUpdated", {
      orderId: order._id,
      status
    });

    res.json({
      message: "Order status updated",
      order
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};