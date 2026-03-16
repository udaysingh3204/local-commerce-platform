const Order = require("../models/Order");
const Product = require("../models/Product");
const Notification = require("../models/Notification");
const Store = require("../models/Store");

const { assignNearestDriver } = require("../services/dispatchService");

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

    /* CREATE ORDER */

    const order = await Order.create({
      ...req.body,
      items: orderItems
    });

    /* GET STORE LOCATION */

    const store = await Store.findById(storeId);

    if (store) {
      order.storeLocation = store.location;
    }

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



exports.getOrdersByStore = async (req, res) => {

  try {

    const orders = await Order.find({
      storeId: req.params.storeId
    }).sort({ createdAt: -1 });

    res.json(orders);

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

};



exports.getOrdersByCustomer = async (req, res) => {

  try {

    const orders = await Order.find({
      customerId: req.params.customerId
    }).sort({ createdAt: -1 });

    res.json(orders);

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

};



exports.updateOrderStatus = async (req, res) => {

  try {

    const { status } = req.body;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { returnDocument: "after" }
    );

    req.app.get("io").emit("orderStatusUpdated", order);

    res.json({
      message: "Order status updated",
      order
    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

};