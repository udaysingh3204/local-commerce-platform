const WholesaleProduct = require("../models/WholesaleProduct");
const WholesaleOrder = require("../models/WholesaleOrder");
exports.createWholesaleProduct = async (req, res) => {

  try {

    const product = await WholesaleProduct.create(req.body);

    res.json(product);

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

};
exports.createWholesaleOrder = async (req, res) => {

  try {

    const order = await WholesaleOrder.create(req.body);

    res.json({
      message: "Wholesale order placed",
      order
    });

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

};
exports.getSupplierOrders = async (req, res) => {

  try {

    const orders = await WholesaleOrder.find({
      supplierId: req.params.supplierId
    }).populate("items.productId");

    res.json(orders);

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

};