const Product = require("../models/Product");

exports.createProduct = async (req, res) => {

  try {

    const product = await Product.create(req.body);

    res.status(201).json({
      message: "Product created successfully",
      product
    });

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

};

exports.getProductsByStore = async (req, res) => {

  try {

    const products = await Product.find({
      storeId: req.params.storeId
    });

    res.json(products);

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

};