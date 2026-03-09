const Order = require("../models/Order");
const Product = require("../models/Product");
const Notification = require("../models/Notification");
exports.createOrder = async (req, res) => {

  try {

    const { items } = req.body;

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
    }

    const order = await Order.create(req.body);

const io = req.app.get("io");
io.emit("newOrder", order);

res.status(201).json({
  message: "Order placed successfully",
  order
});

    // 🔔 Create notification for vendor/store
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

    res.status(500).json({ error: error.message });

  }

};

exports.getOrdersByStore = async (req, res) => {

  try {

    const orders = await Order.find({
      storeId: req.params.storeId
    });

    res.json(orders);

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

};

exports.getOrdersByCustomer = async (req, res) => {

  try {

    const orders = await Order.find({
      customerId: req.params.customerId
    });

    res.json(orders);

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

};
exports.updateOrderStatus = async (req, res) => {

  try {

    const { orderId, status } = req.body;

    const order = await Order.findByIdAndUpdate(
      orderId,
      { status },
      { returnDocument: "after" }
    );

    req.app.get("io").emit("orderStatusUpdated", order);

    res.json({
      message: "Order status updated",
      order
    });

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

};
